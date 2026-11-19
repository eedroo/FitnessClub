import { describe, expect, it } from 'vitest';
import { groupSchema, inviteCode, ranking } from './groups';

describe('grupos', () => {
  it('valida a meta pelos limites do tipo', () => {
    const base = { name: 'Manhãs', description: '', isPublic: false };
    expect(groupSchema.safeParse({ ...base, goalKind: 'SESSIONS', goalTarget: 3 }).success).toBe(true);
    expect(groupSchema.safeParse({ ...base, goalKind: 'SESSIONS', goalTarget: 30 }).success).toBe(false);
    expect(groupSchema.safeParse({ ...base, goalKind: 'MINUTES', goalTarget: 150 }).success).toBe(true);
    expect(groupSchema.safeParse({ ...base, name: 'x', goalKind: 'XP', goalTarget: 300 }).success).toBe(false);
  });

  it('ranking pela meta, desempate por XP; quem cumpriu', () => {
    const r = ranking(
      [
        { userId: 'a', sessions: 2, minutes: 90, xp: 200 },
        { userId: 'b', sessions: 3, minutes: 120, xp: 250 },
        { userId: 'c', sessions: 3, minutes: 100, xp: 300 },
      ],
      'SESSIONS',
      3,
    );
    expect(r.map((x) => [x.userId, x.place, x.met])).toEqual([
      ['c', 1, true],
      ['b', 2, true],
      ['a', 3, false],
    ]);
    expect(r[2]!.progress).toBeCloseTo(2 / 3);
  });

  it('código de convite', () => {
    const c = inviteCode();
    expect(c).toMatch(/^[a-hj-km-np-z2-9]{10}$/);
  });
});
