import { e1rm } from '@/lib/fitness/progress';

/**
 * Níveis de força por exercício (Fase D) — parte interna, só a pessoa vê. Puro.
 * Força relativa: 1RM estimado ÷ peso do corpo (exercícios com carga) ou repetições numa série (peso do corpo).
 * Um padrão único para todas as pessoas (decisão da dona do projecto: sem pedir género); não são normas médicas.
 * Os rácios subiram 25 % em 2026-11-22 (a dona achou as medalhas fáceis demais: supino a meio da prata quando
 * devia estar no fim do bronze).
 */
export const STRENGTH_TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;
export type StrengthTier = (typeof STRENGTH_TIERS)[number];

interface Standard {
  /** 'ratio' = e1RM ÷ peso do corpo; 'reps' = melhor nº de repetições numa série; 'sec' = melhor tempo numa série. */
  by: 'ratio' | 'reps' | 'sec';
  /** Limiar de cada nível (bronze → diamante). */
  at: [number, number, number, number, number];
}

export const STRENGTH_STANDARDS: Record<string, Standard> = {
  'Barbell_Bench_Press_-_Medium_Grip': { by: 'ratio', at: [0.5, 0.75, 1, 1.25, 1.55] },
  // Halteres: a carga registada é a soma dos dois (27 + 27 = 54 kg).
  Dumbbell_Bench_Press: { by: 'ratio', at: [0.45, 0.65, 0.8, 1.05, 1.3] },
  Incline_Dumbbell_Press: { by: 'ratio', at: [0.4, 0.55, 0.75, 0.95, 1.2] },
  Dumbbell_Shoulder_Press: { by: 'ratio', at: [0.25, 0.4, 0.55, 0.7, 0.9] },
  Dumbbell_Bicep_Curl: { by: 'ratio', at: [0.2, 0.3, 0.45, 0.55, 0.7] },
  Goblet_Squat: { by: 'ratio', at: [0.25, 0.45, 0.65, 0.8, 1] },
  Barbell_Squat: { by: 'ratio', at: [0.75, 1, 1.4, 1.75, 2.25] },
  Front_Barbell_Squat: { by: 'ratio', at: [0.65, 0.9, 1.15, 1.45, 1.8] },
  Barbell_Deadlift: { by: 'ratio', at: [1, 1.25, 1.65, 2, 2.5] },
  Romanian_Deadlift: { by: 'ratio', at: [0.75, 1, 1.3, 1.65, 2] },
  Barbell_Hip_Thrust: { by: 'ratio', at: [0.75, 1.15, 1.5, 2, 2.5] },
  Standing_Military_Press: { by: 'ratio', at: [0.3, 0.5, 0.65, 0.8, 1] },
  Barbell_Shoulder_Press: { by: 'ratio', at: [0.3, 0.5, 0.65, 0.8, 1] },
  Bent_Over_Barbell_Row: { by: 'ratio', at: [0.5, 0.7, 0.9, 1.05, 1.3] },
  Barbell_Curl: { by: 'ratio', at: [0.25, 0.4, 0.55, 0.7, 0.9] },
  Pullups: { by: 'reps', at: [1, 4, 8, 12, 18] },
  'Chin-Up': { by: 'reps', at: [1, 5, 9, 13, 19] },
  Pushups: { by: 'reps', at: [8, 15, 25, 40, 55] },
  'Dips_-_Triceps_Version': { by: 'reps', at: [3, 7, 12, 20, 28] },
  // Mais exercícios (pedido da dona do projecto; nunca alongamentos). Halteres: a soma dos dois.
  Barbell_Full_Squat: { by: 'ratio', at: [0.75, 1, 1.4, 1.75, 2.25] },
  Leg_Press: { by: 'ratio', at: [1.25, 1.9, 2.5, 3.45, 4.4] },
  Split_Squat_with_Dumbbells: { by: 'ratio', at: [0.25, 0.45, 0.65, 0.9, 1.15] },
  Dumbbell_Lunges: { by: 'ratio', at: [0.25, 0.45, 0.65, 0.9, 1.15] },
  Barbell_Walking_Lunge: { by: 'ratio', at: [0.4, 0.65, 0.9, 1.15, 1.45] },
  Seated_Leg_Curl: { by: 'ratio', at: [0.4, 0.55, 0.75, 1, 1.25] },
  Lying_Leg_Curls: { by: 'ratio', at: [0.3, 0.5, 0.7, 0.9, 1.15] },
  Standing_Leg_Curl: { by: 'ratio', at: [0.15, 0.25, 0.3, 0.45, 0.55] },
  Thigh_Abductor: { by: 'ratio', at: [0.5, 0.75, 1.05, 1.4, 1.75] },
  Pull_Through: { by: 'ratio', at: [0.25, 0.45, 0.65, 0.9, 1.15] },
  Standing_Dumbbell_Calf_Raise: { by: 'ratio', at: [0.25, 0.45, 0.65, 0.9, 1.15] },
  'Wide-Grip_Lat_Pulldown': { by: 'ratio', at: [0.5, 0.75, 1, 1.25, 1.5] },
  Seated_Cable_Rows: { by: 'ratio', at: [0.5, 0.75, 1, 1.25, 1.5] },
  Dumbbell_Incline_Row: { by: 'ratio', at: [0.4, 0.55, 0.75, 1, 1.25] },
  'Bent_Over_Two-Dumbbell_Row': { by: 'ratio', at: [0.4, 0.55, 0.75, 1, 1.25] },
  'Seated_Bent-Over_Rear_Delt_Raise': { by: 'ratio', at: [0.1, 0.15, 0.25, 0.3, 0.4] },
  Side_Lateral_Raise: { by: 'ratio', at: [0.15, 0.2, 0.3, 0.4, 0.5] },
  Seated_Dumbbell_Press: { by: 'ratio', at: [0.3, 0.5, 0.65, 0.8, 1] },
  Triceps_Pushdown: { by: 'ratio', at: [0.25, 0.4, 0.55, 0.75, 0.95] },
  Hammer_Curls: { by: 'ratio', at: [0.2, 0.3, 0.45, 0.55, 0.7] },
  Hanging_Leg_Raise: { by: 'reps', at: [3, 8, 12, 18, 25] },
  Plank: { by: 'sec', at: [30, 60, 90, 150, 240] },
};

export interface StrengthLevel {
  exerciseId: string;
  tier: StrengthTier | null; // null = ainda abaixo do bronze
  value: number; // rácio (2 casas) ou repetições
  by: 'ratio' | 'reps' | 'sec';
  next: number | null; // limiar do próximo nível (null no diamante)
  progress: number; // 0–1 até ao próximo nível
}

export function strengthLevel(
  exerciseId: string,
  best: { e1rmGrams: number | null; maxReps: number | null; maxSec?: number | null },
  bodyGrams: number | null,
): StrengthLevel | null {
  const std = STRENGTH_STANDARDS[exerciseId];
  if (!std) return null;
  let value: number;
  if (std.by === 'reps') {
    if (!best.maxReps) return null;
    value = best.maxReps;
  } else if (std.by === 'sec') {
    if (!best.maxSec) return null;
    value = best.maxSec;
  } else {
    if (!best.e1rmGrams || !bodyGrams) return null;
    value = Math.round((best.e1rmGrams / bodyGrams) * 100) / 100;
  }
  let i = -1;
  while (i + 1 < std.at.length && value >= std.at[i + 1]!) i++;
  const tier = i >= 0 ? STRENGTH_TIERS[i]! : null;
  const next = i + 1 < std.at.length ? std.at[i + 1]! : null;
  const from = i >= 0 ? std.at[i]! : 0;
  const progress = next == null ? 1 : Math.max(0, Math.min(1, (value - from) / (next - from)));
  return { exerciseId, tier, value, by: std.by, next, progress };
}

export type StrengthBest = { e1rmGrams: number | null; maxReps: number | null; maxSec?: number | null };

/** Junta uma série às melhores marcas (1RM estimado e repetições). */
export function mergeBest(b: StrengthBest | undefined, s: { reps: number | null; weightGrams: number | null; durationSec?: number | null }): StrengthBest {
  const out = { ...(b ?? { e1rmGrams: null, maxReps: null }) };
  const e = s.weightGrams && s.reps ? e1rm(s.weightGrams, s.reps) : null;
  if (e && (out.e1rmGrams ?? 0) < e) out.e1rmGrams = e;
  if (s.reps && (out.maxReps ?? 0) < s.reps) out.maxReps = s.reps;
  if (s.durationSec && (out.maxSec ?? 0) < s.durationSec) out.maxSec = s.durationSec;
  return out;
}

