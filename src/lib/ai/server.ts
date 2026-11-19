import 'server-only';
import type { Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { db } from '@/lib/db';
import { isAdminEmail } from '@/lib/admin';
import { addDays, fromDbDate, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { lastFinishedWeekStart, shiftWeek, weekStartOf } from '@/lib/weeks';
import { getEntitlements } from '@/lib/entitlements/server';
import { dbToAppLocale } from '@/i18n/locales';
import { exerciseName, type ExerciseNames } from '@/lib/fitness/library';
import { FITNESS_TEMPLATES } from '@/lib/fitness/templates';
import { toProfileData } from '@/lib/fitness/profile';
import { aiInsightNotification } from '@/lib/notifications/content';
import { pushToUser } from '@/lib/notifications/send';
import { hasJobs, sendSafely, type AppEvent } from '@/inngest/client';
import { AiError, costMicroUsd, generateJson, hasAi, type AiCall } from './gemini';
import { AI_PROGRAM_RESPONSE_SCHEMA, PROGRAM_SYSTEM, checkAiProgram, fakeProgram, pickCandidates, programPrompt, type CandidateExercise } from './program';
import { INSIGHT_RESPONSE_SCHEMA, INSIGHT_SYSTEM, checkInsight, fakeInsight, insightPrompt, weekFacts, type FactSession, type WeekFacts } from './insights';

/** Limites por pessoa (custo): programas por dia e por mês. As retrospectivas são uma por semana. */
export const PROGRAM_LIMIT_DAY = 3;
export const PROGRAM_LIMIT_MONTH = 15;

export interface AiAccess {
  feature: boolean; // recurso `ai` (premium)
  consent: boolean; // consentimento para enviar dados de treino à IA
  configured: boolean; // há chave do Gemini
}

export async function getAiAccess(userId: string): Promise<AiAccess> {
  const [ent, user] = await Promise.all([getEntitlements(userId), db.user.findUnique({ where: { id: userId }, select: { aiConsentAt: true } })]);
  return { feature: ent.features.ai, consent: !!user?.aiConsentAt, configured: hasAi() };
}

/** Pedidos que falharam ou ficaram presos não contam (a pessoa não recebeu nada); os admins (ADMIN_EMAILS) não têm limite, para testar. */
export async function programQuota(userId: string): Promise<{ day: number; month: number; allowed: boolean }> {
  const now = new Date();
  // Contam os que deram resultado e os que ainda estão a correr (até 4 min); presos e falhados não.
  const counted = {
    userId,
    kind: 'PROGRAM' as const,
    OR: [{ status: { in: ['DONE', 'APPLIED', 'DISCARDED'] as ('DONE' | 'APPLIED' | 'DISCARDED')[] } }, { status: 'PENDING' as const, createdAt: { gte: new Date(now.getTime() - 4 * 60_000) } }],
  };
  const [day, month, user] = await Promise.all([
    db.aiRequest.count({ where: { ...counted, createdAt: { gte: new Date(now.getTime() - 24 * 3600_000) } } }),
    db.aiRequest.count({ where: { ...counted, createdAt: { gte: new Date(now.getTime() - 30 * 24 * 3600_000) } } }),
    db.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ]);
  if (isAdminEmail(user?.email)) return { day, month, allowed: true };
  return { day, month, allowed: day < PROGRAM_LIMIT_DAY && month < PROGRAM_LIMIT_MONTH };
}

/**
 * Envia o evento ao Inngest. Sem Inngest, fora de produção corre o job aqui mesmo (só para testar);
 * em produção marca o pedido como falhado (nunca corre a IA num pedido de página).
 */
export async function dispatchAi(event: AppEvent, onNoJobs: () => Promise<unknown>, failId?: string): Promise<void> {
  if (hasJobs() && (await sendSafely([event]))) return;
  if (process.env.NODE_ENV !== 'production') {
    void onNoJobs().catch((err) => console.error('[ai] job local falhou:', err));
    return;
  }
  if (failId) await db.aiRequest.update({ where: { id: failId }, data: { status: 'FAILED', error: 'Inngest não configurado', finishedAt: new Date() } });
}

/** Chama a IA até 2 vezes (a 2.ª só se a validação falhar), somando tokens e custo. */
async function callValidated<T>(call: AiCall, check: (raw: unknown) => { ok: true; value: T } | { ok: false; reason: string }) {
  let inputTokens = 0;
  let outputTokens = 0;
  let model = '';
  let reason = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await generateJson(attempt === 0 ? call : { ...call, prompt: `${call.prompt}\n\nYour previous answer was rejected: ${reason}. Fix it.` });
      inputTokens += res.inputTokens;
      outputTokens += res.outputTokens;
      model = res.model;
      const c = check(res.json);
      if (c.ok) return { ok: true as const, value: c.value, inputTokens, outputTokens, model };
      reason = c.reason;
    } catch (err) {
      const e = err as AiError & { inputTokens?: number; outputTokens?: number };
      inputTokens += e.inputTokens ?? 0;
      outputTokens += e.outputTokens ?? 0;
      reason = e instanceof Error ? e.message : String(e);
      if (!(e instanceof AiError) || /Gemini (4\d\d)/.test(reason)) break;
    }
  }
  return { ok: false as const, reason, inputTokens, outputTokens, model };
}

const usage = (r: { inputTokens: number; outputTokens: number; model: string }) => ({
  inputTokens: { increment: r.inputTokens },
  outputTokens: { increment: r.outputTokens },
  costMicroUsd: { increment: costMicroUsd(r.inputTokens, r.outputTokens) },
  model: r.model || null,
});

// ─── Programa ────────────────────────────────────────────────────────────────────────────────────

export async function runProgramRequest(requestId: string): Promise<'done' | 'failed' | 'skipped'> {
  const req = await db.aiRequest.findUnique({ where: { id: requestId }, select: { userId: true, status: true, kind: true } });
  if (!req || req.kind !== 'PROGRAM' || req.status !== 'PENDING') return 'skipped';
  const fail = async (error: string, extra: Prisma.AiRequestUpdateInput = {}) => {
    await db.aiRequest.update({ where: { id: requestId }, data: { status: 'FAILED', error: error.slice(0, 500), finishedAt: new Date(), ...extra } });
    return 'failed' as const;
  };
  const access = await getAiAccess(req.userId);
  if (!access.feature || !access.consent) return fail('sem acesso ou sem consentimento');

  const [user, profileRow, library] = await Promise.all([
    db.user.findUnique({ where: { id: req.userId }, select: { locale: true } }),
    db.trainingProfile.findUnique({ where: { userId: req.userId } }),
    db.exercise.findMany({
      where: { source: 'LIBRARY', archivedAt: null },
      select: { id: true, names: true, category: true, equipment: true, level: true, primaryMuscles: true, measure: true, images: true },
    }),
  ]);
  const locale = dbToAppLocale(user?.locale ?? 'PT_PT');
  const profile = toProfileData(profileRow);
  const preferred = new Set(FITNESS_TEMPLATES.flatMap((t) => t.workouts.flatMap((w) => w.items.map((i) => i.exerciseId))));
  const candidates = pickCandidates(
    library.map(
      (e): CandidateExercise => ({
        id: e.id,
        name: (e.names as ExerciseNames).en ?? e.id,
        category: e.category,
        equipment: e.equipment,
        level: e.level,
        primaryMuscles: e.primaryMuscles,
        measure: e.measure,
        hasImages: e.images.length > 0,
      }),
    ),
    profile,
    preferred,
  );
  if (candidates.length < 4) return fail('poucos exercícios para o equipamento escolhido');

  const res = await callValidated(
    {
      system: PROGRAM_SYSTEM,
      prompt: programPrompt(profile, candidates, locale),
      schema: AI_PROGRAM_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.5,
      thinkingBudget: 1024,
      fake: () => fakeProgram(candidates, locale),
    },
    (raw) => {
      const c = checkAiProgram(raw, candidates);
      return c.ok ? { ok: true, value: c.program } : c;
    },
  );
  if (!res.ok) return fail(res.reason, usage(res));
  await db.aiRequest.update({
    where: { id: requestId },
    data: { status: 'DONE', result: res.value as unknown as Prisma.InputJsonValue, finishedAt: new Date(), error: null, ...usage(res) },
  });
  return 'done';
}

// ─── Retrospectiva semanal ───────────────────────────────────────────────────────────────────────

/** Factos da semana (domingo `weekStart`) calculados pela app, com os nomes dos exercícios na língua da pessoa. */
export async function buildWeekFacts(userId: string, weekStart: DateISO): Promise<WeekFacts> {
  const [user, profile] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { locale: true } }),
    db.trainingProfile.findUnique({ where: { userId }, select: { goals: true, level: true, trainingDays: true } }),
  ]);
  const locale = dbToAppLocale(user?.locale ?? 'PT_PT');
  const prev = shiftWeek(weekStart, 1);
  const history = [1, 2, 3].map((n) => shiftWeek(weekStart, n));
  const from = history[2]!;
  const to = addDays(weekStart, 6);
  const sessions = await db.fitnessSession.findMany({
    where: { userId, endedAt: { not: null }, date: { gte: toDbDate(from), lte: toDbDate(to) } },
    orderBy: { startedAt: 'asc' },
    select: {
      date: true,
      workout: { select: { name: true } },
      sets: { orderBy: { order: 'asc' }, select: { exerciseId: true, reps: true, weightGrams: true, durationSec: true, prKinds: true } },
    },
  });
  const exIds = [...new Set(sessions.flatMap((s) => s.sets.map((x) => x.exerciseId)))];
  const exercises = await db.exercise.findMany({ where: { id: { in: exIds } }, select: { id: true, names: true } });
  const names = Object.fromEntries(exercises.map((e) => [e.id, exerciseName(e.names as ExerciseNames, locale)]));
  const facts: FactSession[] = sessions.map((s) => ({ weekStart: weekStartOf(fromDbDate(s.date)), workoutName: s.workout?.name ?? null, sets: s.sets }));
  return weekFacts(
    {
      weekStart,
      weekEnd: to,
      sessions: facts,
      names,
      plannedDays: profile?.trainingDays.length || null,
      goals: profile?.goals ?? [],
      level: profile?.level ?? 'BEGINNER',
    },
    prev,
    history,
  );
}

/** Cria (ou retoma) a retrospectiva da semana e corre a IA. Idempotente por (pessoa, semana). */
export async function runInsight(userId: string, weekStart: DateISO, opts: { notify: boolean }): Promise<'done' | 'failed' | 'skipped'> {
  const access = await getAiAccess(userId);
  if (!access.feature || !access.consent) return 'skipped';
  const key = { userId_kind_weekStart: { userId, kind: 'INSIGHT' as const, weekStart: toDbDate(weekStart) } };
  const existing = await db.aiRequest.findUnique({ where: key, select: { id: true, status: true } });
  if (existing && existing.status !== 'PENDING' && existing.status !== 'FAILED') return 'skipped';
  const facts = await buildWeekFacts(userId, weekStart);
  const row = existing
    ? await db.aiRequest.update({ where: { id: existing.id }, data: { status: 'PENDING', error: null, facts: facts as unknown as Prisma.InputJsonValue }, select: { id: true } })
    : await db.aiRequest.create({
        data: { userId, kind: 'INSIGHT', weekStart: toDbDate(weekStart), facts: facts as unknown as Prisma.InputJsonValue },
        select: { id: true },
      });
  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true } });
  const locale = dbToAppLocale(user?.locale ?? 'PT_PT');
  const res = await callValidated(
    {
      system: INSIGHT_SYSTEM,
      prompt: insightPrompt(facts, locale),
      schema: INSIGHT_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.6,
      thinkingBudget: 0,
      fake: () => fakeInsight(facts, locale),
    },
    (raw) => {
      const c = checkInsight(raw, facts);
      return c.ok ? { ok: true, value: c.insight } : c;
    },
  );
  if (!res.ok) {
    await db.aiRequest.update({ where: { id: row.id }, data: { status: 'FAILED', error: res.reason.slice(0, 500), finishedAt: new Date(), ...usage(res) } });
    return 'failed';
  }
  await db.aiRequest.update({
    where: { id: row.id },
    data: { status: 'DONE', result: res.value as unknown as Prisma.InputJsonValue, finishedAt: new Date(), error: null, ...usage(res) },
  });
  if (opts.notify && user) await pushToUser(userId, { ...aiInsightNotification(user.locale, row.id), tag: 'ai-insight' }, { ttl: 24 * 3600 });
  return 'done';
}

/** Hora local de envio da retrospectiva automática: domingo às 9h, para a semana que acabou no sábado. */
export const INSIGHT_LOCAL_HOUR = 9;

/** Pessoas a quem cabe a retrospectiva agora (domingo, 9h no fuso delas), com sessões na semana que acabou. */
export async function dueInsights(now: Date = new Date()): Promise<{ userId: string; weekStart: DateISO }[]> {
  const users = await db.user.findMany({
    where: { aiConsentAt: { not: null }, OR: [{ fitnessPrefs: null }, { fitnessPrefs: { aiWeeklyInsights: true } }] },
    select: { id: true, timezone: true },
  });
  const out: { userId: string; weekStart: DateISO }[] = [];
  for (const u of users) {
    const local = DateTime.fromJSDate(now, { zone: u.timezone });
    if (!local.isValid || local.weekday !== 7 || local.hour !== INSIGHT_LOCAL_HOUR) continue;
    const weekStart = lastFinishedWeekStart(todayInTz(u.timezone, now));
    if (!(await getEntitlements(u.id)).features.ai) continue;
    const [done, trained] = await Promise.all([
      db.aiRequest.findUnique({ where: { userId_kind_weekStart: { userId: u.id, kind: 'INSIGHT', weekStart: toDbDate(weekStart) } }, select: { id: true } }),
      db.fitnessSession.count({ where: { userId: u.id, endedAt: { not: null }, date: { gte: toDbDate(weekStart), lte: toDbDate(addDays(weekStart, 6)) } } }),
    ]);
    if (!done && trained > 0) out.push({ userId: u.id, weekStart });
  }
  return out;
}
