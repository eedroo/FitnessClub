import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import { db } from '@/lib/db';
import { addDays, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { translatorFor } from '@/i18n/translator';
import { FITNESS_TEMPLATES } from '@/lib/fitness/templates';
import { recomputeExercisePrs } from '@/lib/fitness/queries';
import { XP, xpForLevel } from '@/lib/gamification/xp';
import { levelsFor } from '@/lib/gamification/server';
import { leagueOf } from '@/lib/social/leagues';
import { BOTS, nextSets, rng, startingKg, trainsToday, type BotDef, type Progress } from './roster';

/**
 * Bots (contas de demonstração, sem etiqueta visível) — servidor. Criar (com histórico até ao nível de cada um), o dia de treino diário
 * (Inngest), as publicações, ocultar e apagar. A definição `bots` (`AppSetting`) guarda `{ visible }`: ocultos, os
 * bots entram na lista de bloqueados de toda a gente (somem do feed, perfis, pesquisa e ranking) e não treinam.
 */
// Os dias dos bots seguem Lisboa (o job corre ao meio-dia de Lisboa).
const TZ = 'Europe/Lisbon';
const SETTING = 'bots';
const EMAIL = (handle: string) => `${handle}@bots.fitnessclub.invalid`;

export interface BotSettings {
  visible: boolean;
}

export async function getBotSettings(): Promise<BotSettings> {
  const row = await db.appSetting.findUnique({ where: { key: SETTING } });
  const v = (row?.value ?? {}) as Partial<BotSettings>;
  return { visible: v.visible !== false };
}

export async function setBotsVisible(visible: boolean): Promise<void> {
  await db.appSetting.upsert({ where: { key: SETTING }, create: { key: SETTING, value: { visible } }, update: { value: { visible } } });
}

/** Ids dos bots a esconder (todos, quando estão ocultos; nenhum, quando visíveis). Uma consulta por pedido. */
export const hiddenBotIds = cache(async (): Promise<string[]> => {
  if ((await getBotSettings()).visible) return [];
  return (await db.user.findMany({ where: { isBot: true }, select: { id: true } })).map((u) => u.id);
});

// ─── Textos das publicações ──────────────────────────────────────────────────────────────────────

function postTexts(): string[] {
  try {
    const file = path.join(process.cwd(), 'content', 'bots', 'posts.json');
    return (JSON.parse(fs.readFileSync(file, 'utf8')) as { texts: string[] }).texts;
  } catch {
    return [''];
  }
}

/** Hora local de Lisboa (inverno UTC+0, verão UTC+1) → instante. */
function lisbonTime(date: DateISO, hour: number, minute: number): Date {
  const guess = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`);
  const local = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: TZ }).format(guess));
  return new Date(guess.getTime() - (local - hour) * 3_600_000);
}

// ─── Uma sessão de um bot ────────────────────────────────────────────────────────────────────────

type Item = { exerciseId: string; sets: number; min: number; max: number; sec: number | null; withKg: boolean };
type Workout = { id: string; name: string; items: Item[] };

async function botWorkouts(userId: string): Promise<Workout[]> {
  const program = await db.fitnessProgram.findFirst({
    where: { userId },
    include: { workouts: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' }, include: { exercise: { select: { measure: true } } } } } } },
  });
  return (program?.workouts ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    items: w.items.map((i) => ({
      exerciseId: i.exerciseId,
      sets: i.targetSets ?? 3,
      min: i.targetRepsMin ?? 8,
      max: i.targetRepsMax ?? i.targetRepsMin ?? 12,
      sec: i.exercise.measure === 'DURATION' ? (i.targetSec ?? 30) : null,
      withKg: i.exercise.measure === 'REPS_WEIGHT',
    })),
  }));
}

/** Última vez de cada exercício do bot (para continuar a progressão no dia seguinte). */
async function lastProgress(userId: string, exerciseIds: string[]): Promise<Map<string, Progress & { sec?: number }>> {
  const out = new Map<string, Progress & { sec?: number }>();
  for (const exerciseId of exerciseIds) {
    const last = await db.sessionSet.findFirst({ where: { userId, exerciseId }, orderBy: { completedAt: 'desc' }, select: { sessionId: true } });
    if (!last) continue;
    const sets = await db.sessionSet.findMany({ where: { sessionId: last.sessionId, exerciseId }, orderBy: { order: 'asc' } });
    out.set(exerciseId, {
      kg: sets[0]?.weightGrams != null ? sets[0].weightGrams / 1000 : null,
      reps: sets.map((s) => s.reps ?? 0),
      sec: sets[0]?.durationSec ?? undefined,
    });
  }
  return out;
}

/** Grava uma sessão (com as séries pela progressão dupla) e devolve o id e quantas séries teve. */
async function logSession(
  bot: { id: string; def: BotDef },
  workout: Workout,
  date: DateISO,
  progress: Map<string, Progress & { sec?: number }>,
  r: () => number,
  /** Hora local mais tardia para começar (hoje: antes de agora, para o treino nunca ficar no futuro). */
  latestHour = 20,
): Promise<{ id: string; sets: number; startedAt: Date; endedAt: Date }> {
  const hour = 6 + Math.floor(r() * Math.max(1, latestHour - 6));
  const minute = Math.floor(r() * 60);
  const startedAt = lisbonTime(date, hour, minute);
  let t = startedAt.getTime() + 4 * 60_000;
  const rows: { exerciseId: string; order: number; reps: number | null; weightGrams: number | null; durationSec: number | null; completedAt: Date }[] = [];
  for (const item of workout.items) {
    const last = progress.get(item.exerciseId);
    let next: Progress & { sec?: number };
    if (item.sec != null) {
      const sec = Math.min(item.sec * 3, (last?.sec ?? item.sec) + (r() < 0.6 ? 5 : 0));
      next = { kg: null, reps: [], sec };
    } else {
      const start: Progress = last ?? { kg: item.withKg ? startingKg(item.exerciseId, bot.def.strength) : null, reps: [] };
      next = nextSets(start, item.min, item.max, item.sets, r());
    }
    progress.set(item.exerciseId, next);
    for (let i = 0; i < item.sets; i++) {
      t += (60 + Math.floor(r() * 60)) * 1000 + 40_000;
      rows.push({
        exerciseId: item.exerciseId,
        order: i + 1,
        reps: item.sec != null ? null : (next.reps[i] ?? item.min),
        weightGrams: item.sec == null && next.kg != null ? Math.round(next.kg * 1000) : null,
        durationSec: item.sec != null ? (next.sec ?? item.sec) : null,
        completedAt: new Date(t),
      });
    }
  }
  const endedAt = new Date(t + 3 * 60_000);
  const session = await db.fitnessSession.create({
    data: { userId: bot.id, workoutId: workout.id, date: toDbDate(date), startedAt, endedAt, sets: { create: rows.map((s) => ({ ...s, userId: bot.id, restSec: 90 })) } },
    select: { id: true },
  });
  return { id: session.id, sets: rows.length, startedAt, endedAt };
}

/** Publicação de um bot com o retrato da sessão (público, para alimentar o feed). */
async function postSession(botId: string, sessionId: string, workoutName: string, at: Date, r: () => number): Promise<void> {
  const s = await db.fitnessSession.findUnique({
    where: { id: sessionId },
    include: { sets: { select: { exerciseId: true, reps: true, weightGrams: true, prKinds: true, exercise: { select: { names: true } } } } },
  });
  if (!s || !s.endedAt) return;
  const names = [...new Map(s.sets.map((x) => [x.exerciseId, (x.exercise.names as Record<string, string>)['pt-BR'] ?? (x.exercise.names as Record<string, string>).en ?? x.exerciseId])).values()];
  const texts = postTexts();
  const text = (texts[Math.floor(r() * texts.length)] ?? '').replace('{workout}', workoutName).trim();
  await db.post.create({
    data: {
      authorId: botId,
      text: text || null,
      visibility: 'PUBLIC',
      sessionId,
      createdAt: new Date(at.getTime() + 2 * 60_000),
      workout: {
        kind: 'session',
        name: workoutName,
        date: s.date.toISOString().slice(0, 10),
        durationSec: Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 1000),
        sets: s.sets.length,
        volumeKg: Math.round(s.sets.reduce((n, x) => n + (x.reps ?? 0) * (x.weightGrams ?? 0), 0) / 100) / 10,
        prs: s.sets.filter((x) => x.prKinds.length > 0).length,
        exercises: names.slice(0, 8),
      },
    },
  });
}

/**
 * Recalcula os recordes e mantém o bot na liga dele: se o nível passou da liga (o acaso dos treinos, ou semanas de
 * treino diário), tira os treinos mais antigos até voltar. Nunca mexe na semana actual (o XP do ranking).
 */
async function keepInLeague(userId: string, def: BotDef, exerciseIds: string[]): Promise<void> {
  const recompute = async () => {
    for (const ex of exerciseIds) await recomputeExercisePrs(userId, ex);
  };
  await recompute();
  const weekAgo = toDbDate(addDays(todayInTz(TZ), -7));
  for (let guard = 0; guard < 40 && leagueOf((await levelsFor([userId])).get(userId) ?? 1) !== leagueOf(def.level); guard++) {
    const oldest = await db.fitnessSession.findFirst({ where: { userId, date: { lt: weekAgo } }, orderBy: { startedAt: 'asc' }, select: { id: true } });
    if (!oldest) break;
    await db.fitnessSession.delete({ where: { id: oldest.id } });
    await recompute();
  }
}

// ─── Criar ───────────────────────────────────────────────────────────────────────────────────────

/** Programa do bot a partir do modelo (nomes em pt-BR). */
async function createProgram(userId: string, def: BotDef): Promise<void> {
  const tpl = FITNESS_TEMPLATES.find((t) => t.id === def.template)!;
  const t = translatorFor('PT_BR');
  await db.fitnessProgram.create({
    data: {
      userId,
      name: t(`fitness.templates.${tpl.id}.name`),
      kind: tpl.kind,
      order: 0,
      workouts: {
        create: tpl.workouts.map((w, wi) => ({
          userId,
          name: t(`fitness.templates.${tpl.id}.workouts.${w.key}`),
          order: wi,
          items: {
            create: w.items.map((i, ii) => ({
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
  });
}

/**
 * Cria os bots que ainda não existem, cada um com o histórico necessário para chegar ao seu nível (as últimas
 * semanas, ao ritmo de treinos dele) e algumas publicações recentes. Devolve quantos criou.
 */
export async function createBots(): Promise<number> {
  const existing = new Set((await db.socialProfile.findMany({ where: { handle: { in: BOTS.map((b) => b.handle) } }, select: { handle: true } })).map((p) => p.handle));
  const today = todayInTz(TZ);
  let created = 0;
  for (const [n, def] of BOTS.entries()) {
    if (existing.has(def.handle)) continue;
    const user = await db.user.create({
      data: {
        email: EMAIL(def.handle),
        passwordHash: '!', // sem login (o authorize recusa bots de qualquer forma)
        name: def.name,
        locale: 'PT_BR',
        timezone: TZ,
        isBot: true,
        onboardedAt: new Date(),
        emailVerifiedAt: new Date(),
        socialProfile: { create: { handle: def.handle, displayName: def.name, bio: def.bio, inRanking: true } },
        fitnessPrefs: { create: { onboardedAt: new Date(), tourDoneAt: new Date() } },
      },
      select: { id: true },
    });
    await createProgram(user.id, def);
    const workouts = await botWorkouts(user.id);
    const r = rng(1000 + n * 97);
    // Semanas de histórico para chegar ao nível: ~ (séries × 2 + 50) por treino, mais 100 por semana cumprida.
    const setsPerSession = workouts[0]!.items.reduce((s, i) => s + i.sets, 0);
    const perWeekXp = def.perWeek * (XP.session + Math.min(setsPerSession, XP.setCap) * XP.set + 15) + XP.week;
    const weeks = Math.ceil((xpForLevel(def.level) + 60) / perWeekXp) + 1;
    const progress = new Map<string, Progress & { sec?: number }>();
    const posts: { id: string; name: string; at: Date }[] = [];
    let w = 0;
    let trainedYesterday = false;
    for (let d = addDays(today, -weeks * 7); d < today; d = addDays(d, 1)) {
      if (!trainsToday(def.perWeek, trainedYesterday, r())) {
        trainedYesterday = false;
        continue;
      }
      const workout = workouts[w % workouts.length]!;
      w++;
      const s = await logSession({ id: user.id, def }, workout, d, progress, r);
      trainedYesterday = true;
      if (d >= addDays(today, -6) && r() < 0.6) posts.push({ id: s.id, name: workout.name, at: s.endedAt });
    }
    await keepInLeague(user.id, def, [...new Set(workouts.flatMap((wk) => wk.items.map((i) => i.exerciseId)))]);
    for (const p of posts) await postSession(user.id, p.id, p.name, p.at, r);
    created++;
  }
  return created;
}

// ─── O dia de cada bot (Inngest, todas as noites) ────────────────────────────────────────────────

/**
 * Cada bot, ao acaso e ao seu ritmo, faz o treino seguinte do programa (com a progressão dupla a partir da última
 * vez) e, às vezes, publica. Não faz nada com os bots ocultos. Repetir no mesmo dia não duplica.
 */
export async function runBotsDay(): Promise<{ trained: number; posted: number }> {
  if (!(await getBotSettings()).visible) return { trained: 0, posted: 0 };
  const bots = await db.user.findMany({ where: { isBot: true }, select: { id: true, socialProfile: { select: { handle: true } } } });
  const today = todayInTz(TZ);
  const r = rng(Date.now() % 2_147_483_647);
  let trained = 0;
  let posted = 0;
  for (const b of bots) {
    const def = BOTS.find((x) => x.handle === b.socialProfile?.handle);
    if (!def) continue;
    const recent = await db.fitnessSession.findMany({
      where: { userId: b.id, date: { gte: toDbDate(addDays(today, -1)) } },
      select: { date: true },
    });
    if (recent.some((s) => s.date.getTime() === toDbDate(today).getTime())) continue; // já treinou hoje
    if (!trainsToday(def.perWeek, recent.length > 0, r())) continue;
    // O treino de hoje acaba antes de agora (começa até 2 h antes da hora local actual; cedo de mais, fica para amanhã).
    const nowHour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: TZ }).format(new Date()));
    if (nowHour < 8) continue;
    const workouts = await botWorkouts(b.id);
    if (!workouts.length) continue;
    // O treino seguinte ao último.
    const last = await db.fitnessSession.findFirst({ where: { userId: b.id }, orderBy: { startedAt: 'desc' }, select: { workoutId: true } });
    const i = Math.max(0, workouts.findIndex((w) => w.id === last?.workoutId));
    const workout = workouts[(i + 1) % workouts.length]!;
    const progress = await lastProgress(b.id, workout.items.map((it) => it.exerciseId));
    const s = await logSession({ id: b.id, def }, workout, today, progress, r, nowHour - 2);
    await keepInLeague(b.id, def, workouts.flatMap((w) => w.items.map((it) => it.exerciseId)));
    trained++;
    if (r() < 0.55) {
      await postSession(b.id, s.id, workout.name, s.endedAt, r);
      posted++;
    }
  }
  // Pedidos de amizade feitos a bots: aceites (ninguém fica à espera de um placeholder).
  await db.friendship.updateMany({ where: { status: 'PENDING', addressee: { isBot: true } }, data: { status: 'ACCEPTED' } });
  return { trained, posted };
}

/** Apaga todos os bots (contas, treinos, publicações). */
export async function deleteBots(): Promise<number> {
  const { count } = await db.user.deleteMany({ where: { isBot: true } });
  return count;
}

/** Para o admin: cada bot com o nº de treinos, de publicações e o último treino. */
export async function botStatus() {
  const bots = await db.user.findMany({
    where: { isBot: true },
    select: {
      id: true,
      name: true,
      socialProfile: { select: { handle: true } },
      _count: { select: { fitnessSessions: true, posts: true } },
      fitnessSessions: { orderBy: { startedAt: 'desc' }, take: 1, select: { startedAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return bots.map((b) => ({
    id: b.id,
    name: b.name,
    handle: b.socialProfile?.handle ?? '',
    sessions: b._count.fitnessSessions,
    posts: b._count.posts,
    lastAt: b.fitnessSessions[0]?.startedAt ?? null,
  }));
}
