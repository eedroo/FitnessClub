import type { ExerciseMeasure } from '@prisma/client';
import type { LastPerformance } from './types';

/**
 * Progressão dupla (método da dona do projecto). Puro.
 *
 * Com um alvo de reps (ex.: 3 × 5–8) e a mesma carga, cada sessão soma UMA repetição à última vez, na primeira série
 * que a pode receber sem ficar mais de 1 rep acima da série seguinte. Ex.: 6,5,5 → 6,6,5 → 7,6,5 → 7,6,6 → 7,7,6 →
 * 8,7,6 → 8,7,7 → 8,8,7 → 8,8,8. Com todas as séries no máximo do alvo, sobe a carga e as reps voltam ao mínimo.
 */
export type ProgressionKind = 'add-rep' | 'add-weight' | 'complete-sets' | 'top-of-range';

export interface ProgressionSuggestion {
  kind: ProgressionKind;
  /** Uma entrada por série sugerida (reps e carga). */
  sets: { reps: number; weightGrams: number | null }[];
}

/** Aumento de carga por equipamento (gramas): halteres sobem de 2 kg, o resto de 2,5 kg. */
export function weightIncrementGrams(equipment: string | null): number {
  return equipment === 'dumbbell' || equipment === 'kettlebells' ? 2000 : 2500;
}

/** Próxima distribuição de reps: +1 na primeira série possível (máx. `max`, nunca mais de 1 acima da seguinte). */
export function nextReps(reps: number[], max: number): number[] | null {
  for (let i = 0; i < reps.length; i++) {
    const r = reps[i]!;
    if (r >= max) continue;
    if (i > 0 && r >= reps[i - 1]!) continue; // não passar a série anterior
    if (i < reps.length - 1 && r + 1 - reps[i + 1]! > 1) continue; // no máximo 1 acima da seguinte
    return reps.map((x, j) => (j === i ? x + 1 : x));
  }
  // Distribuição fora do padrão (ex.: 5,8,6): sobe a série mais fraca que ainda não está no máximo.
  const below = reps.map((r, i) => ({ r, i })).filter((x) => x.r < max);
  if (!below.length) return null;
  const weakest = below.reduce((a, b) => (b.r < a.r ? b : a));
  return reps.map((x, j) => (j === weakest.i ? x + 1 : x));
}

export function suggestProgression(i: {
  measure: ExerciseMeasure;
  equipment: string | null;
  last: LastPerformance | null;
  target: { sets: number | null; repsMin: number | null; repsMax: number | null };
}): ProgressionSuggestion | null {
  const { last, target } = i;
  if (i.measure === 'DURATION' || !last || target.repsMax == null) return null;
  const done = last.sets.filter((s) => s.reps != null);
  if (!done.length) return null;
  const min = target.repsMin ?? target.repsMax;
  const max = target.repsMax;
  const count = target.sets ?? done.length;
  const weight = (k: number) => done[Math.min(k, done.length - 1)]!.weightGrams;
  const reps = done.slice(0, count).map((s) => s.reps!);

  // Da última vez ficaram séries por fazer: primeiro completar as séries do alvo (as em falta no mínimo).
  if (reps.length < count) {
    const sets = Array.from({ length: count }, (_, k) => ({ reps: reps[k] ?? min, weightGrams: weight(k) }));
    return { kind: 'complete-sets', sets };
  }

  const next = nextReps(reps, max);
  if (next) return { kind: 'add-rep', sets: next.map((r, k) => ({ reps: r, weightGrams: weight(k) })) };

  // Tudo no máximo do alvo: com carga, sobe a carga e as reps voltam ao mínimo; sem carga (peso do corpo), avisa.
  const top = Math.max(...done.map((s) => s.weightGrams ?? 0));
  if (i.measure === 'REPS_WEIGHT' && top > 0) {
    const up = top + weightIncrementGrams(i.equipment);
    return { kind: 'add-weight', sets: Array.from({ length: count }, () => ({ reps: min, weightGrams: up })) };
  }
  return { kind: 'top-of-range', sets: reps.map((r, k) => ({ reps: r, weightGrams: weight(k) })) };
}
