import { z } from 'zod';

/** Grupos (Fase C3). Puro: validação, limites da meta, ranking da semana e quem cumpriu. */
export const GOAL_KINDS = ['SESSIONS', 'MINUTES', 'XP'] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

export const GOAL_LIMITS: Record<GoalKind, { min: number; max: number; default: number }> = {
  SESSIONS: { min: 1, max: 14, default: 3 },
  MINUTES: { min: 10, max: 1500, default: 150 },
  XP: { min: 50, max: 5000, default: 300 },
};

export const MAX_GROUP_MEMBERS = 50;
export const MAX_GROUPS_PER_USER = 20;

export const groupSchema = z
  .object({
    name: z.string().trim().min(2).max(40),
    description: z
      .string()
      .trim()
      .max(200)
      .nullable()
      .transform((v) => v || null),
    isPublic: z.boolean(),
    goalKind: z.enum(GOAL_KINDS),
    goalTarget: z.number().int(),
  })
  .refine((g) => g.goalTarget >= GOAL_LIMITS[g.goalKind].min && g.goalTarget <= GOAL_LIMITS[g.goalKind].max, { path: ['goalTarget'] });

export type GroupInput = z.input<typeof groupSchema>;

export interface WeekStat {
  userId: string;
  sessions: number; // sessões com séries + atividades
  minutes: number;
  xp: number;
}

export const statFor = (s: WeekStat, kind: GoalKind) => (kind === 'SESSIONS' ? s.sessions : kind === 'MINUTES' ? s.minutes : s.xp);

/** Ranking da semana pela meta do grupo (empates: mais XP, depois mais minutos). */
export function ranking(stats: WeekStat[], kind: GoalKind, target: number) {
  return [...stats]
    .sort((a, b) => statFor(b, kind) - statFor(a, kind) || b.xp - a.xp || b.minutes - a.minutes)
    .map((s, i) => ({ ...s, place: i + 1, value: statFor(s, kind), met: statFor(s, kind) >= target, progress: Math.min(1, statFor(s, kind) / target) }));
}

/** Código do link de convite: 10 caracteres sem ambiguidades (sem 0/O, 1/l). */
export function inviteCode(random: () => number = Math.random): string {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => abc[Math.floor(random() * abc.length)]).join('');
}
