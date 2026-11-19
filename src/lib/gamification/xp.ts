import type { DateISO } from '@/lib/dates';

/**
 * Gamificação (Fase D) — parte externa. Puro. O XP vem só de consistência e esforço (sessões, séries, recordes,
 * semanas cumpridas), nunca da carga absoluta: é justo para qualquer corpo. Tudo é calculado a partir do histórico
 * (nada guardado), por isso editar ou apagar uma sessão corrige o XP sozinho.
 */
export const XP = {
  session: 50, // sessão terminada com pelo menos uma série
  set: 2, // por série
  setCap: 30, // máx. de séries que contam por sessão
  pr: 15, // por série com recorde
  prCap: 3, // máx. de recordes que contam por sessão
  week: 100, // semana cumprida (domingo a sábado)
} as const;

export interface XpSession {
  id: string;
  weekStart: DateISO; // domingo da semana da sessão (de `weeks.ts`)
  date: DateISO;
  sets: number;
  prs: number; // séries com recorde
  /** Atividade (corrida, yoga…): minutos; dá 1 XP por minuto (até 90) e conta para a semana, sem séries nem recordes. */
  activityMinutes?: number;
}

/** Conta como treino: sessão com séries ou atividade com pelo menos 1 minuto. */
export const counts = (s: Pick<XpSession, 'sets' | 'activityMinutes'>) => s.sets > 0 || (s.activityMinutes ?? 0) > 0;
export const ACTIVITY_XP_CAP = 90;

export function sessionXp(s: Pick<XpSession, 'sets' | 'prs' | 'activityMinutes'>): number {
  if (s.activityMinutes != null) return Math.min(Math.max(0, Math.floor(s.activityMinutes)), ACTIVITY_XP_CAP);
  if (s.sets <= 0) return 0;
  return XP.session + Math.min(s.sets, XP.setCap) * XP.set + Math.min(s.prs, XP.prCap) * XP.pr;
}

/** Sessões que uma semana precisa para contar: o plano do perfil (1 ou mais), no máximo 2 — fácil de manter, difícil de falhar sem querer. */
export function weekGoal(plannedDays: number | null): number {
  return Math.max(1, Math.min(plannedDays ?? 2, 2));
}

/**
 * XP total para chegar ao nível `level`. Níveis são só números, sem tecto. Até ao 10 sobe depressa (2 = 100, 3 = 300,
 * 4 = 600 … 10 = 4500); daí em diante cada nível custa sempre 1000 XP (umas 2 a 3 semanas de treino regular).
 */
export const FLAT_FROM = 10;
export const FLAT_COST = 1000;
export function xpForLevel(level: number): number {
  if (level <= FLAT_FROM) return 50 * level * (level - 1);
  return 50 * FLAT_FROM * (FLAT_FROM - 1) + (level - FLAT_FROM) * FLAT_COST;
}

export function levelOf(xp: number): { level: number; into: number; span: number } {
  let level = 1;
  while (level < FLAT_FROM && xpForLevel(level + 1) <= xp) level++;
  if (level >= FLAT_FROM) level = FLAT_FROM + Math.floor((xp - xpForLevel(FLAT_FROM)) / FLAT_COST);
  const base = xpForLevel(level);
  return { level, into: xp - base, span: xpForLevel(level + 1) - base };
}

export interface WeekRun {
  /** Semanas cumpridas seguidas até agora (a semana em curso só conta se já estiver cumprida; não a parte). */
  current: number;
  best: number;
  /** Semanas cumpridas, por ordem. */
  weeks: DateISO[];
}

/** Semanas cumpridas e sequências. `weekStarts` são todos os domingos desde a primeira sessão até à semana em curso. */
export function weekRuns(sessions: XpSession[], weekStarts: DateISO[], goal: number): WeekRun {
  const count = new Map<DateISO, number>();
  for (const s of sessions) if (counts(s)) count.set(s.weekStart, (count.get(s.weekStart) ?? 0) + 1);
  const done = weekStarts.map((w) => (count.get(w) ?? 0) >= goal);
  let best = 0;
  let run = 0;
  for (const d of done) {
    run = d ? run + 1 : 0;
    best = Math.max(best, run);
  }
  // A semana em curso (a última) ainda pode ser cumprida: se não está, a sequência é a que acabou na anterior.
  let current = 0;
  for (let i = done.length - 1; i >= 0; i--) {
    if (done[i]) current++;
    else if (i === done.length - 1) continue;
    else break;
  }
  return { current, best, weeks: weekStarts.filter((_, i) => done[i]) };
}

export interface XpSummary {
  xp: number;
  level: number;
  into: number;
  span: number;
  sessions: number;
  sets: number;
  prs: number;
  weeks: WeekRun;
  activities: number;
  breakdown: { sessions: number; sets: number; prs: number; activities: number; weeks: number };
}

export function xpSummary(sessions: XpSession[], weekStarts: DateISO[], plannedDays: number | null): XpSummary {
  const valid = sessions.filter(counts);
  const strength = valid.filter((s) => s.activityMinutes == null);
  const acts = valid.filter((s) => s.activityMinutes != null);
  const weeks = weekRuns(valid, weekStarts, weekGoal(plannedDays));
  const breakdown = {
    sessions: strength.length * XP.session,
    sets: strength.reduce((n, s) => n + Math.min(s.sets, XP.setCap) * XP.set, 0),
    prs: strength.reduce((n, s) => n + Math.min(s.prs, XP.prCap) * XP.pr, 0),
    activities: acts.reduce((n, s) => n + sessionXp(s), 0),
    weeks: weeks.weeks.length * XP.week,
  };
  const xp = breakdown.sessions + breakdown.sets + breakdown.prs + breakdown.activities + breakdown.weeks;
  return {
    xp,
    ...levelOf(xp),
    activities: acts.length,
    sessions: strength.length,
    sets: valid.reduce((n, s) => n + s.sets, 0),
    prs: valid.reduce((n, s) => n + s.prs, 0),
    weeks,
    breakdown,
  };
}
