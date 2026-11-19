import 'server-only';
import { db } from '@/lib/db';
import { addDays, fromDbDate, todayInTz } from '@/lib/dates';
import { shiftWeek, sundaysBetween, weekStartOf } from '@/lib/weeks';
import { badgeStates, type BadgeId, type BadgeState } from './badges';
import { counts, sessionXp, xpSummary, type XpSession, type XpSummary } from './xp';
import { STRENGTH_STANDARDS, mergeBest, strengthLevel, type StrengthBest, type StrengthLevel } from './strength';

/** Sessões terminadas da pessoa, em ordem, com nº de séries e de recordes (base de todo o XP e emblemas). */
async function xpSessions(userId: string): Promise<XpSession[]> {
  const [sessions, prs, activities] = await Promise.all([
    db.fitnessSession.findMany({
      where: { userId, endedAt: { not: null } },
      orderBy: { startedAt: 'asc' },
      select: { id: true, date: true, startedAt: true, _count: { select: { sets: true } } },
    }),
    db.sessionSet.groupBy({ by: ['sessionId'], where: { userId, NOT: { prKinds: { isEmpty: true } } }, _count: { _all: true } }),
    db.activity.findMany({ where: { userId }, select: { id: true, date: true, startedAt: true, durationSec: true } }),
  ]);
  const prBy = new Map(prs.map((p) => [p.sessionId, p._count._all]));
  // Sessões e atividades por ordem cronológica (as atividades contam para a semana e dão XP pelos minutos).
  return [
    ...sessions.map((s) => ({ at: s.startedAt.getTime(), id: s.id, date: fromDbDate(s.date), sets: s._count.sets, prs: prBy.get(s.id) ?? 0 })),
    ...activities.map((a) => ({ at: a.startedAt.getTime(), id: a.id, date: fromDbDate(a.date), sets: 0, prs: 0, activityMinutes: Math.floor(a.durationSec / 60) })),
  ]
    .sort((a, b) => a.at - b.at)
    .map(({ at: _at, ...x }) => ({ ...x, weekStart: weekStartOf(x.date) }));
}

const consecutive = (a: string, b: string) => shiftWeek(b, 1) === a;
const weekEnd = (start: string) => addDays(start, 6);

function compute(sessions: XpSession[], today: string, plannedDays: number | null) {
  const first = sessions.find(counts);
  const weeks = first ? sundaysBetween(first.weekStart, weekStartOf(today)) : [];
  const summary = xpSummary(sessions, weeks, plannedDays);
  const badges = badgeStates(sessions, summary.weeks.weeks, weekEnd, consecutive);
  return { summary, badges };
}

export interface Gamification {
  summary: XpSummary;
  badges: BadgeState[];
}

export async function getGamification(userId: string): Promise<Gamification> {
  const [user, profile, sessions] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
    db.trainingProfile.findUnique({ where: { userId }, select: { trainingDays: true } }),
    xpSessions(userId),
  ]);
  return compute(sessions, todayInTz(user?.timezone ?? 'Europe/Lisbon'), profile?.trainingDays.length || null);
}

/** O que uma sessão rendeu: o XP dela e os emblemas ganhos com ela (para o resumo da sessão). */
export async function sessionRewards(userId: string, sessionId: string): Promise<{ xp: number; badges: BadgeId[]; level: number; levelUp: boolean } | null> {
  const [profile, sessions] = await Promise.all([
    db.trainingProfile.findUnique({ where: { userId }, select: { trainingDays: true } }),
    xpSessions(userId),
  ]);
  const i = sessions.findIndex((s) => s.id === sessionId);
  if (i < 0) return null;
  const s = sessions[i]!;
  const planned = profile?.trainingDays.length || null;
  // Até ao fim da semana desta sessão, com e sem ela.
  const until = sessions.slice(0, i + 1);
  const before = sessions.slice(0, i);
  const day = s.date;
  const withIt = compute(until, day, planned);
  const without = compute(before, day, planned);
  const had = new Set(without.badges.filter((b) => b.earnedOn).map((b) => b.id));
  return {
    xp: withIt.summary.xp - without.summary.xp || sessionXp(s),
    badges: withIt.badges.filter((b) => b.earnedOn && !had.has(b.id)).map((b) => b.id),
    level: withIt.summary.level,
    levelUp: withIt.summary.level > without.summary.level,
  };
}

/** Melhores marcas nos exercícios com padrão e o peso do corpo mais recente (só com o consentimento de saúde). */
export async function getStrengthBests(userId: string, only?: string[]): Promise<{ bodyGrams: number | null; best: Record<string, StrengthBest> }> {
  const ids = Object.keys(STRENGTH_STANDARDS).filter((id) => !only || only.includes(id));
  if (!ids.length) return { bodyGrams: null, best: {} };
  const [user, weight, sets] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { wellbeingConsentAt: true } }),
    db.bodyWeightEntry.findFirst({ where: { userId }, orderBy: { date: 'desc' }, select: { grams: true } }),
    db.sessionSet.findMany({ where: { userId, exerciseId: { in: ids } }, select: { exerciseId: true, reps: true, weightGrams: true } }),
  ]);
  const best: Record<string, StrengthBest> = {};
  for (const s of sets) best[s.exerciseId] = mergeBest(best[s.exerciseId], s);
  return { bodyGrams: user?.wellbeingConsentAt ? (weight?.grams ?? null) : null, best };
}

/** Níveis de força (só a pessoa vê). `needsWeight`: há exercícios com carga à espera do peso do corpo. */
export async function getStrengthLevels(userId: string): Promise<{ levels: StrengthLevel[]; needsWeight: boolean }> {
  const { bodyGrams, best } = await getStrengthBests(userId);
  const levels: StrengthLevel[] = [];
  let needsWeight = false;
  for (const [id, b] of Object.entries(best)) {
    const lvl = strengthLevel(id, b, bodyGrams);
    if (lvl) levels.push(lvl);
    else if (STRENGTH_STANDARDS[id]?.by === 'ratio' && b.e1rmGrams && !bodyGrams) needsWeight = true;
  }
  return { levels, needsWeight };
}
