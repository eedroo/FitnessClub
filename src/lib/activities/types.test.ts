import { describe, expect, it } from 'vitest';
import { ACTIVITY_GROUPS, ACTIVITY_KEYS, activityGroup, activitySchema, effortBand, hasDistance } from './types';

describe('atividades', () => {
  it('todos os tipos têm um grupo conhecido; corrida e natação pedem distância, yoga não', () => {
    expect(ACTIVITY_KEYS.length).toBeGreaterThan(70);
    for (const k of ACTIVITY_KEYS) expect(ACTIVITY_GROUPS).toContain(activityGroup(k));
    expect([hasDistance('running'), hasDistance('pool_swim'), hasDistance('yoga')]).toEqual([true, true, false]);
  });

  it('esforço 1–10 em quatro faixas', () => {
    expect([1, 3, 4, 6, 7, 8, 9, 10].map(effortBand)).toEqual(['easy', 'easy', 'moderate', 'moderate', 'hard', 'hard', 'allOut', 'allOut']);
  });

  it('valida e tira a distância a tipos sem distância', () => {
    const base = { date: '2026-11-19', time: '07:30', durationMin: 45, effort: 6, distanceKm: 5, notes: '' };
    expect(activitySchema.parse({ ...base, type: 'running' })).toMatchObject({ distanceKm: 5, notes: null });
    expect(activitySchema.parse({ ...base, type: 'yoga' }).distanceKm).toBeNull();
    expect(activitySchema.safeParse({ ...base, type: 'quidditch' }).success).toBe(false);
    expect(activitySchema.safeParse({ ...base, type: 'running', time: '25:00' }).success).toBe(false);
    expect(activitySchema.safeParse({ ...base, type: 'running', durationMin: 0 }).success).toBe(false);
  });
});
