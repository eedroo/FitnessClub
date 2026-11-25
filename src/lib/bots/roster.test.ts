import { describe, expect, it } from 'vitest';
import { BOTS, nextSets, rng, startingKg, trainsToday, type Progress } from './roster';
import { leagueOf } from '@/lib/social/leagues';
import { handleSchema } from '@/lib/social/rules';

describe('bots', () => {
  it('@ válidos e únicos, espalhados pelas 3 primeiras ligas', () => {
    expect(BOTS.every((b) => handleSchema.safeParse(b.handle).success)).toBe(true);
    expect(new Set(BOTS.map((b) => b.handle)).size).toBe(BOTS.length);
    const leagues = BOTS.map((b) => leagueOf(b.level));
    for (const l of ['bronze', 'silver', 'gold']) expect(leagues.filter((x) => x === l).length).toBe(3);
  });
  it('progressão dupla: soma reps até ao topo e depois sobe a carga', () => {
    let p: Progress = { kg: 40, reps: [8, 8, 7] };
    p = nextSets(p, 6, 10, 3, 0.5);
    expect(p).toEqual({ kg: 40, reps: [8, 8, 8] });
    p = nextSets({ kg: 40, reps: [10, 10, 10] }, 6, 10, 3, 0.5);
    expect(p.kg).toBe(42.5);
    expect(Math.max(...p.reps)).toBeLessThan(10);
    expect(nextSets({ kg: 10, reps: [12, 12, 12] }, 8, 12, 3, 0.5).kg).toBe(11);
    expect(nextSets({ kg: null, reps: [10, 10, 10] }, 6, 10, 3, 0.5)).toEqual({ kg: null, reps: [10, 10, 10] });
  });
  it('dia mau repete; quem treina pouco não treina dois dias seguidos', () => {
    expect(nextSets({ kg: 40, reps: [8, 8, 8] }, 6, 10, 3, 0.1)).toEqual({ kg: 40, reps: [8, 8, 8] });
    expect(trainsToday(3, true, 0)).toBe(false);
    expect(trainsToday(5, true, 0.1)).toBe(true);
    expect(trainsToday(3, false, 0.9)).toBe(false);
  });
  it('cargas de partida e aleatório com semente', () => {
    expect(startingKg('Barbell_Squat', 1)).toBe(50);
    expect(startingKg('Side_Lateral_Raise', 0.6)).toBe(7.5);
    const a = rng(42), b = rng(42);
    expect([a(), a()]).toEqual([b(), b()]);
  });
});
