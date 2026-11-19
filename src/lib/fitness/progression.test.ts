import { describe, expect, it } from 'vitest';
import { nextReps, suggestProgression, weightIncrementGrams } from './progression';

const last = (reps: number[], kg = 50) => ({ date: '2026-11-18', sets: reps.map((r) => ({ reps: r, weightGrams: kg * 1000, durationSec: null })) });
const target = { sets: 3, repsMin: 5, repsMax: 8 };

describe('nextReps (a sequência da dona do projecto, 3 × 5–8)', () => {
  it('sobe uma rep de cada vez até 8,8,8', () => {
    const seq = [[6, 5, 5], [6, 6, 5], [7, 6, 5], [7, 6, 6], [7, 7, 6], [8, 7, 6], [8, 7, 7], [8, 8, 7], [8, 8, 8]];
    for (let k = 0; k < seq.length - 1; k++) expect(nextReps(seq[k]!, 8)).toEqual(seq[k + 1]);
  });

  it('a partir do mínimo: 5,5,5 → 6,5,5', () => {
    expect(nextReps([5, 5, 5], 8)).toEqual([6, 5, 5]);
  });

  it('no máximo não há próxima', () => {
    expect(nextReps([8, 8, 8], 8)).toBeNull();
  });

  it('fora do padrão sobe a série mais fraca', () => {
    expect(nextReps([5, 8, 8], 8)).toEqual([6, 8, 8]);
  });
});

describe('suggestProgression', () => {
  it('8,7,6 com 50 kg → 8,7,7 com 50 kg', () => {
    expect(suggestProgression({ measure: 'REPS_WEIGHT', equipment: 'barbell', last: last([8, 7, 6]), target })).toEqual({
      kind: 'add-rep',
      sets: [8, 7, 7].map((reps) => ({ reps, weightGrams: 50000 })),
    });
  });

  it('8,8,8 → sobe 2,5 kg e volta a 5,5,5', () => {
    expect(suggestProgression({ measure: 'REPS_WEIGHT', equipment: 'barbell', last: last([8, 8, 8]), target })).toEqual({
      kind: 'add-weight',
      sets: [5, 5, 5].map((reps) => ({ reps, weightGrams: 52500 })),
    });
  });

  it('halteres sobem 2 kg', () => {
    expect(weightIncrementGrams('dumbbell')).toBe(2000);
    expect(suggestProgression({ measure: 'REPS_WEIGHT', equipment: 'dumbbell', last: last([8, 8, 8], 20), target })?.sets[0]).toEqual({ reps: 5, weightGrams: 22000 });
  });

  it('da última vez fez 2 de 3 séries: completar primeiro', () => {
    expect(suggestProgression({ measure: 'REPS_WEIGHT', equipment: null, last: last([7, 6]), target })).toEqual({
      kind: 'complete-sets',
      sets: [{ reps: 7, weightGrams: 50000 }, { reps: 6, weightGrams: 50000 }, { reps: 5, weightGrams: 50000 }],
    });
  });

  it('peso do corpo no topo do alvo: avisa em vez de subir carga', () => {
    const l = { date: '2026-11-18', sets: [12, 12, 12].map((r) => ({ reps: r, weightGrams: null, durationSec: null })) };
    expect(suggestProgression({ measure: 'REPS', equipment: 'body only', last: l, target: { sets: 3, repsMin: 8, repsMax: 12 } })?.kind).toBe('top-of-range');
  });

  it('sem alvo de reps, sem histórico ou por tempo: sem sugestão', () => {
    expect(suggestProgression({ measure: 'REPS_WEIGHT', equipment: null, last: last([8]), target: { sets: 3, repsMin: null, repsMax: null } })).toBeNull();
    expect(suggestProgression({ measure: 'REPS_WEIGHT', equipment: null, last: null, target })).toBeNull();
    expect(suggestProgression({ measure: 'DURATION', equipment: null, last: last([8]), target })).toBeNull();
  });
});
