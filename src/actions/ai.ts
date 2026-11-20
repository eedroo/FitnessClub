'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { toDbDate, todayInTz } from '@/lib/dates';
import { lastFinishedWeekStart } from '@/lib/weeks';
import { getEntitlements } from '@/lib/entitlements/server';
import { aiProgramSchema } from '@/lib/ai/program';
import { trainingProfileSchema, type TrainingProfileData, type TrainingProfileInput } from '@/lib/fitness/profile';
import { AI_JOB_TIMEOUT_MS, buildWeekFacts, dispatchAi, getAiAccess, programQuota, runInsight, runProgramRequest } from '@/lib/ai/server';

/**
 * Acções da IA (Fase B). A IA só corre em jobs do Inngest; aqui só se criam pedidos, se guarda o resultado e o
 * consentimento. Pedir à IA exige o recurso `ai` (premium), o consentimento e a chave configurada.
 */
type Result<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };
const fail = (error = 'common.errors.generic') => ({ ok: false as const, error });

async function uid(): Promise<string | null> {
  const s = await auth();
  return s?.user?.id ?? null;
}

const refresh = () => revalidatePath('/', 'layout');

/** Dar ou retirar o consentimento para enviar dados de treino à IA (aberto a todos, como os outros consentimentos). */
export async function setAiConsent(on: boolean): Promise<Result> {
  const id = await uid();
  if (!id) return fail('common.errors.unauthorized');
  if (typeof on !== 'boolean') return fail();
  await db.user.update({ where: { id }, data: { aiConsentAt: on ? new Date() : null } });
  refresh();
  return { ok: true };
}

/** Retrospectiva automática ao domingo (ligada por defeito). */
export async function setWeeklyInsights(on: boolean): Promise<Result> {
  const id = await uid();
  if (!id) return fail('common.errors.unauthorized');
  if (typeof on !== 'boolean') return fail();
  await db.fitnessPrefs.upsert({ where: { userId: id }, create: { userId: id, aiWeeklyInsights: on }, update: { aiWeeklyInsights: on } });
  refresh();
  return { ok: true };
}

const requestId = z.string().min(1).max(191);

async function ready(id: string): Promise<string | null> {
  const access = await getAiAccess(id);
  if (!access.feature) return 'ai.errors.premium';
  if (!access.consent) return 'ai.errors.consent';
  if (!access.configured) return 'ai.errors.unavailable';
  return null;
}

/**
 * Pede um programa à IA com as respostas desta vez (objectivos, nível, equipamento, foco, dias, tempo, pedidos):
 * cada programa pode ser diferente (2× por semana, segunda a sexta, na praça…). As respostas ficam no pedido e
 * passam a ser as sugestões da próxima vez (perfil de treino). Devolve o id do pedido (a revisão espera o job).
 */
export async function requestAiProgram(input: TrainingProfileInput): Promise<Result<{ id: string }>> {
  const id = await uid();
  if (!id) return fail('common.errors.unauthorized');
  const brief = trainingProfileSchema.safeParse(input);
  if (!brief.success) return fail('fitness.profile.errors.invalid');
  return startProgram(id, brief.data);
}

/** "Pedir outro": as mesmas respostas do pedido anterior. */
export async function retryAiProgram(input: string): Promise<Result<{ id: string }>> {
  const id = await uid();
  if (!id) return fail('common.errors.unauthorized');
  const rid = requestId.safeParse(input);
  if (!rid.success) return fail();
  const prev = await db.aiRequest.findFirst({ where: { id: rid.data, userId: id, kind: 'PROGRAM' }, select: { facts: true } });
  const brief = trainingProfileSchema.safeParse(prev?.facts);
  if (!brief.success) return fail('ai.errors.profile');
  await db.aiRequest.updateMany({ where: { id: rid.data, userId: id, status: { in: ['DONE', 'FAILED'] } }, data: { status: 'DISCARDED' } });
  return startProgram(id, brief.data);
}

async function startProgram(id: string, brief: TrainingProfileData): Promise<Result<{ id: string }>> {
  const blocked = await ready(id);
  if (blocked) return fail(blocked);
  const pending = await db.aiRequest.findFirst({ where: { userId: id, kind: 'PROGRAM', status: 'PENDING', createdAt: { gte: new Date(Date.now() - AI_JOB_TIMEOUT_MS) } }, select: { id: true } });
  if (pending) return { ok: true, data: { id: pending.id } };
  if (!(await programQuota(id)).allowed) return fail('ai.errors.limit');
  await db.trainingProfile.upsert({ where: { userId: id }, create: { userId: id, ...brief }, update: brief });
  const req = await db.aiRequest.create({ data: { userId: id, kind: 'PROGRAM', facts: brief as unknown as Prisma.InputJsonValue }, select: { id: true } });
  await dispatchAi({ name: 'ai/program.requested', data: { requestId: req.id } }, () => runProgramRequest(req.id), req.id);
  return { ok: true, data: { id: req.id } };
}

/**
 * Guarda o programa proposto: programa, treinos e itens como os da pessoa, com as notas marcadas como da IA.
 * Cada exercício leva uma só nota (a mesma que a pessoa edita); a da IA só entra onde a pessoa não escreveu a sua.
 */
export async function saveAiProgram(input: string): Promise<Result<{ programId: string }>> {
  const id = await uid();
  if (!id) return fail('common.errors.unauthorized');
  const rid = requestId.safeParse(input);
  if (!rid.success) return fail();
  const ent = await getEntitlements(id);
  if (!ent.features.pro || !ent.features.ai) return fail('ai.errors.premium');
  const req = await db.aiRequest.findFirst({ where: { id: rid.data, userId: id, kind: 'PROGRAM', status: 'DONE' }, select: { result: true } });
  if (!req) return fail();
  const parsed = aiProgramSchema.safeParse(req.result);
  if (!parsed.success) return fail();
  const program = parsed.data;
  const exIds = [...new Set(program.workouts.flatMap((w) => w.items.map((i) => i.exerciseId)))];
  const known = new Set((await db.exercise.findMany({ where: { id: { in: exIds }, source: 'LIBRARY' }, select: { id: true } })).map((e) => e.id));

  const programId = await db.$transaction(async (tx) => {
    const agg = await tx.fitnessProgram.aggregate({ where: { userId: id }, _max: { order: true } });
    const created = await tx.fitnessProgram.create({
      data: {
        userId: id,
        name: program.name,
        description: program.description ?? null,
        kind: program.kind,
        notes: program.notes || null,
        notesByAi: !!program.notes,
        order: (agg._max.order ?? -1) + 1,
        workouts: {
          create: program.workouts.map((w, wi) => ({
            userId: id,
            name: w.name,
            notes: w.notes || null,
            notesByAi: !!w.notes,
            order: wi,
            items: {
              create: w.items
                .filter((i) => known.has(i.exerciseId))
                .map((i, ii) => ({
                  exerciseId: i.exerciseId,
                  order: ii,
                  targetSets: i.sets,
                  targetRepsMin: i.repsMin ?? null,
                  targetRepsMax: i.repsMax ?? null,
                  targetSec: i.sec ?? null,
                  restSec: i.restSec ?? null,

                })),
            },
          })),
        },
      },
      select: { id: true },
    });
    // Uma só nota por exercício (a mesma que a pessoa edita): a da IA só entra onde a pessoa não escreveu a sua.
    const notes = new Map<string, string>();
    for (const w of program.workouts)
      for (const i of w.items) {
        const text = [i.note, i.cue].filter(Boolean).join(' ');
        if (text && known.has(i.exerciseId) && !notes.has(i.exerciseId)) notes.set(i.exerciseId, text);
      }
    const mine = new Set(
      (await tx.exerciseNote.findMany({ where: { userId: id, exerciseId: { in: [...notes.keys()] }, byAi: false }, select: { exerciseId: true } })).map((n) => n.exerciseId),
    );
    for (const [exerciseId, text] of notes) {
      if (mine.has(exerciseId)) continue;
      await tx.exerciseNote.upsert({
        where: { userId_exerciseId: { userId: id, exerciseId } },
        create: { userId: id, exerciseId, text, byAi: true },
        update: { text, byAi: true },
      });
    }
    await tx.aiRequest.update({ where: { id: rid.data }, data: { status: 'APPLIED', result: { ...program, programId: created.id } as unknown as Prisma.InputJsonValue } });
    return created.id;
  });
  refresh();
  return { ok: true, data: { programId } };
}

export async function discardAiProgram(input: string): Promise<Result> {
  const id = await uid();
  if (!id) return fail('common.errors.unauthorized');
  const rid = requestId.safeParse(input);
  if (!rid.success) return fail();
  await db.aiRequest.updateMany({ where: { id: rid.data, userId: id, kind: 'PROGRAM', status: { in: ['DONE', 'FAILED'] } }, data: { status: 'DISCARDED' } });
  refresh();
  return { ok: true };
}

/** Retrospectiva da última semana completa, pedida na app (uma por semana; se já existe, abre-a). */
export async function requestWeekInsight(): Promise<Result<{ id: string }>> {
  const id = await uid();
  if (!id) return fail('common.errors.unauthorized');
  const blocked = await ready(id);
  if (blocked) return fail(blocked);
  const user = await db.user.findUnique({ where: { id }, select: { timezone: true } });
  const weekStart = lastFinishedWeekStart(todayInTz(user?.timezone ?? 'Europe/Lisbon'));
  const key = { userId_kind_weekStart: { userId: id, kind: 'INSIGHT' as const, weekStart: toDbDate(weekStart) } };
  const existing = await db.aiRequest.findUnique({ where: key, select: { id: true, status: true } });
  if (existing && existing.status !== 'FAILED') return { ok: true, data: { id: existing.id } };
  if (existing && (await db.aiRequest.count({ where: { userId: id, kind: 'INSIGHT', createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } } })) > 3)
    return fail('ai.errors.limit');
  const facts = (await buildWeekFacts(id, weekStart)) as unknown as Prisma.InputJsonValue;
  const row = existing
    ? await db.aiRequest.update({ where: { id: existing.id }, data: { status: 'PENDING', error: null, facts }, select: { id: true } })
    : await db.aiRequest.create({ data: { userId: id, kind: 'INSIGHT', weekStart: toDbDate(weekStart), facts }, select: { id: true } });
  await dispatchAi({ name: 'ai/insight.requested', data: { userId: id, weekStart } }, () => runInsight(id, weekStart, { notify: false }), row.id);
  refresh();
  return { ok: true, data: { id: row.id } };
}

export async function markInsightRead(input: string): Promise<Result> {
  const id = await uid();
  if (!id) return fail('common.errors.unauthorized');
  const rid = requestId.safeParse(input);
  if (!rid.success) return fail();
  await db.aiRequest.updateMany({ where: { id: rid.data, userId: id, kind: 'INSIGHT', readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}
