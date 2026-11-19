import type { DateISO } from '@/lib/dates';
import { counts, type XpSession } from './xp';

/**
 * Emblemas por feitos (Fase D). Puro: cada emblema tem a data em que foi ganho (a sessão ou a semana que cruzou
 * o limiar). As metas de grupo chegam com a rede social (Fase C).
 */
export const BADGES = [
  { id: 'first_workout', kind: 'sessions', n: 1 },
  { id: 'workouts_10', kind: 'sessions', n: 10 },
  { id: 'workouts_50', kind: 'sessions', n: 50 },
  { id: 'workouts_100', kind: 'sessions', n: 100 },
  { id: 'workouts_250', kind: 'sessions', n: 250 },
  { id: 'first_pr', kind: 'prs', n: 1 },
  { id: 'prs_25', kind: 'prs', n: 25 },
  { id: 'prs_100', kind: 'prs', n: 100 },
  { id: 'sets_1000', kind: 'sets', n: 1000 },
  { id: 'streak_4', kind: 'streak', n: 4 },
  { id: 'streak_12', kind: 'streak', n: 12 },
  { id: 'streak_26', kind: 'streak', n: 26 },
] as const;

export type BadgeId = (typeof BADGES)[number]['id'];

export interface BadgeState {
  id: BadgeId;
  earnedOn: DateISO | null;
  /** Progresso para o limiar (0–1). */
  progress: number;
}

/**
 * `sessions` por ordem cronológica; `doneWeeks` são as semanas cumpridas (domingos, por ordem). A sequência de
 * semanas é ganha no sábado da semana que a completa.
 */
export function badgeStates(sessions: XpSession[], doneWeeks: DateISO[], weekEnd: (start: DateISO) => DateISO, consecutive: (a: DateISO, b: DateISO) => boolean): BadgeState[] {
  const valid = sessions.filter(counts);
  const totals = { sessions: valid.length, prs: 0, sets: 0 };
  const firstAt = { sessions: new Map<number, DateISO>(), prs: new Map<number, DateISO>(), sets: new Map<number, DateISO>() };
  let n = 0;
  let prs = 0;
  let sets = 0;
  for (const s of valid) {
    n++;
    prs += s.prs;
    sets += s.sets;
    for (const b of BADGES) {
      const value = b.kind === 'sessions' ? n : b.kind === 'prs' ? prs : b.kind === 'sets' ? sets : 0;
      if (b.kind !== 'streak' && value >= b.n && !firstAt[b.kind].has(b.n)) firstAt[b.kind].set(b.n, s.date);
    }
  }
  totals.prs = prs;
  totals.sets = sets;

  const streakAt = new Map<number, DateISO>();
  let run = 0;
  let best = 0;
  doneWeeks.forEach((w, i) => {
    run = i > 0 && consecutive(doneWeeks[i - 1]!, w) ? run + 1 : 1;
    best = Math.max(best, run);
    for (const b of BADGES) if (b.kind === 'streak' && run >= b.n && !streakAt.has(b.n)) streakAt.set(b.n, weekEnd(w));
  });

  return BADGES.map((b) => {
    const value = b.kind === 'streak' ? best : totals[b.kind];
    const earnedOn = b.kind === 'streak' ? (streakAt.get(b.n) ?? null) : (firstAt[b.kind].get(b.n) ?? null);
    return { id: b.id, earnedOn, progress: Math.min(1, value / b.n) };
  });
}
