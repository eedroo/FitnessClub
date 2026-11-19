import { z } from 'zod';
import { MAP_MUSCLES, type MapMuscle } from '@/lib/body/muscles';

/** Perfil de treino (onboarding e definições). Listas fixas, validação e a recomendação de modelo sem IA. Puro. */
export const GOALS = ['strength', 'hypertrophy', 'fat_loss', 'endurance', 'health', 'sport'] as const;
export const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export const EQUIPMENT = ['full_gym', 'free_weights', 'home_basic', 'bodyweight', 'outdoor', 'bands'] as const;
export const SESSION_MINUTES = [30, 45, 60, 75, 90] as const;

export type Goal = (typeof GOALS)[number];
export type Level = (typeof LEVELS)[number];
export type EquipmentKind = (typeof EQUIPMENT)[number];

export const trainingProfileSchema = z.object({
  goals: z.array(z.enum(GOALS)).max(GOALS.length).transform((v) => [...new Set(v)]),
  level: z.enum(LEVELS),
  equipment: z.array(z.enum(EQUIPMENT)).max(EQUIPMENT.length).transform((v) => [...new Set(v)]),
  focusMuscles: z
    .array(z.string())
    .max(MAP_MUSCLES.length)
    .transform((v) => [...new Set(v)].filter((m): m is MapMuscle => (MAP_MUSCLES as string[]).includes(m))),
  trainingDays: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .transform((v) => [...new Set(v)].sort((a, b) => a - b)),
  sessionMinutes: z.number().int().min(10).max(240).nullable(),
  wishes: z.string().max(2000).transform((v) => v.trim() || null).nullable(),
  avoid: z.string().max(2000).transform((v) => v.trim() || null).nullable(),
});

export type TrainingProfileInput = z.input<typeof trainingProfileSchema>;
export type TrainingProfileData = z.output<typeof trainingProfileSchema>;

export const EMPTY_PROFILE: TrainingProfileData = {
  goals: [],
  level: 'BEGINNER',
  equipment: [],
  focusMuscles: [],
  trainingDays: [],
  sessionMinutes: 60,
  wishes: null,
  avoid: null,
};

/**
 * Modelo de programa sugerido pelo perfil (sem IA): só alongamentos sem equipamento de ginásio; 4+ dias → superior/inferior;
 * 3 dias → push · pull · legs (corpo inteiro para iniciantes); 1–2 dias → corpo inteiro.
 */
export function recommendTemplate(p: Pick<TrainingProfileData, 'trainingDays' | 'level' | 'equipment' | 'goals'>): 'ppl' | 'fullbody' | 'upperlower' | 'stretch' {
  const gym = p.equipment.length === 0 || p.equipment.some((e) => e === 'full_gym' || e === 'free_weights');
  if (!gym && p.goals.length > 0 && p.goals.every((g) => g === 'health')) return 'stretch';
  const days = p.trainingDays.length;
  if (days >= 4) return 'upperlower';
  if (days === 3) return p.level === 'BEGINNER' ? 'fullbody' : 'ppl';
  return 'fullbody';
}

/** Linha da base (ou null) → dados do formulário (valores desconhecidos caem fora pela validação). */
export function toProfileData(row: { goals: string[]; level: string; equipment: string[]; focusMuscles: string[]; trainingDays: number[]; sessionMinutes: number | null; wishes: string | null; avoid: string | null } | null): TrainingProfileData {
  if (!row) return EMPTY_PROFILE;
  const p = trainingProfileSchema.safeParse({
    ...row,
    goals: row.goals.filter((g) => (GOALS as readonly string[]).includes(g)),
    equipment: row.equipment.filter((e) => (EQUIPMENT as readonly string[]).includes(e)),
  });
  return p.success ? p.data : EMPTY_PROFILE;
}
