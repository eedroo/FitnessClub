import { describe, expect, it } from 'vitest';
import { bestsOf, compareTotals, compareWithPrevious, dayStats, detectPrs, e1rm, EMPTY_BESTS, recomputePrs, sessionTotals, sumTotals, summarize } from './progress';

describe('e1rm', () => {
  it('Epley até 12 reps', () => {
    expect(e1rm(60000, 10)).toBe(80000);
    expect(e1rm(60000, 15)).toBeNull();
  });
});

describe('detectPrs', () => {
  it('primeira vez não é recorde', () => {
    expect(detectPrs({ reps: 10, weightGrams: 60000 }, EMPTY_BESTS)).toEqual([]);
  });
  it('peso maior', () => {
    expect(detectPrs({ reps: 5, weightGrams: 70000 }, bestsOf([{ reps: 10, weightGrams: 60000 }]))).toContain('weight');
  });
  it('mesmo peso com mais reps', () => {
    expect(detectPrs({ reps: 11, weightGrams: 60000 }, bestsOf([{ reps: 10, weightGrams: 60000 }]))).toContain('reps');
    expect(detectPrs({ reps: 11, weightGrams: 60000 }, bestsOf([{ reps: 10, weightGrams: 60000 }]))).not.toContain('weight');
  });
});

describe('recomputePrs', () => {
  const at = (m: number) => new Date(Date.UTC(2026, 9, 1, 10, m));
  const sets = [
    { id: 'a', completedAt: at(0), reps: 10, weightGrams: 60000 },
    { id: 'b', completedAt: at(5), reps: 8, weightGrams: 70000 },
    { id: 'c', completedAt: at(10), reps: 6, weightGrams: 65000 },
  ];
  it('marca o recorde e passa-o à seguinte quando a série é apagada', () => {
    expect(recomputePrs(sets).b).toContain('weight');
    expect(recomputePrs(sets).c).not.toContain('weight');
    const after = recomputePrs(sets.filter((s) => s.id !== 'b'));
    expect(after.a).toEqual([]);
    expect(after.c).toContain('weight');
  });
});

describe('comparação e dia', () => {
  it('compareWithPrevious', () => {
    const cur = summarize([{ reps: 10, weightGrams: 60000 }, { reps: 10, weightGrams: 60000 }, { reps: 10, weightGrams: 60000 }]);
    const prev = summarize([{ reps: 9, weightGrams: 60000 }, { reps: 9, weightGrams: 60000 }, { reps: 9, weightGrams: 60000 }]);
    const c = compareWithPrevious(cur, prev);
    expect(c.reps).toEqual({ value: 30, delta: 3, pct: 11.1 });
    const zero = compareWithPrevious(cur, { ...prev, reps: 0 });
    expect(zero.reps!.pct).toBeNull();
  });

  it('dayStats', () => {
    const t = (m: number) => new Date(Date.UTC(2026, 9, 1, 10, m));
    const s = (exerciseId: string, w: number, reps: number, m: number) => ({ exerciseId, weightGrams: w, reps, completedAt: t(m), prKinds: [] as string[] });
    const out = dayStats([
      {
        startedAt: t(0),
        endedAt: t(30),
        sets: [s('a', 60000, 11, 2), s('a', 60000, 10, 4), s('a', 60000, 10, 6), s('b', 100000, 10, 10), { ...s('b', 100000, 9, 14), prKinds: ['reps'] }],
      },
    ]);
    expect(out).toMatchObject({ sets: 5, reps: 50, exercises: 2, volumeGrams: 3_760_000, durationSec: 1800, sessionTimeSec: 720, avgRestSec: 180, prs: 1 });
  });
});

describe('sessionTotals e compareTotals', () => {
  const cur = [{ reps: 8, weightGrams: 50000 }, { reps: 7, weightGrams: 50000 }, { reps: 7, weightGrams: 50000 }];
  const prev = [{ reps: 8, weightGrams: 50000 }, { reps: 7, weightGrams: 50000 }, { reps: 6, weightGrams: 50000 }];

  it('soma séries, reps, volume e a carga máxima', () => {
    expect(sessionTotals(cur)).toEqual({ sets: 3, reps: 22, volumeGrams: 1_100_000, topWeightGrams: 50000 });
    expect(sessionTotals([{ reps: 12 }]).topWeightGrams).toBeNull();
  });

  it('compara com a anterior (delta e %)', () => {
    const c = compareTotals(sessionTotals(cur), sessionTotals(prev));
    expect(c.reps).toEqual({ value: 22, delta: 1, pct: 4.8 });
    expect(c.volumeGrams).toEqual({ value: 1_100_000, delta: 50_000, pct: 4.8 });
    expect(c.topWeightGrams).toEqual({ value: 50000, delta: 0, pct: 0 });
  });

  it('sem anterior: tudo null', () => {
    expect(compareTotals(sessionTotals(cur), null).volumeGrams).toBeNull();
  });
});

describe('sumTotals', () => {
  it('soma séries, reps e volume; a carga máxima é a maior', () => {
    expect(sumTotals([
      { sets: 3, reps: 24, volumeGrams: 1_200_000, topWeightGrams: 50000 },
      { sets: 2, reps: 20, volumeGrams: 400_000, topWeightGrams: null },
    ])).toEqual({ sets: 5, reps: 44, volumeGrams: 1_600_000, topWeightGrams: 50000 });
  });
});
