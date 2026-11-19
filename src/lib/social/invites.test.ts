import { describe, expect, it } from 'vitest';
import { canSeeInvite, distanceKm, inviteSchema, roundCoord } from './invites';

const base = {
  title: 'Corrida no parque',
  description: '',
  activityType: 'running',
  date: '2026-11-22',
  time: '08:30',
  durationMin: 60,
  place: { name: 'Parque Eduardo VII', lat: 38.728312, lng: -9.154876 },
  visibility: 'PUBLIC' as const,
  maxPeople: null,
  invitees: [],
};

describe('convites', () => {
  it('valida e arredonda o local a ~100 m', () => {
    const p = inviteSchema.parse(base);
    expect(p.place).toEqual({ name: 'Parque Eduardo VII', lat: 38.728, lng: -9.155 });
    expect(p.description).toBeNull();
    expect(inviteSchema.safeParse({ ...base, activityType: 'teleport' }).success).toBe(false);
    expect(inviteSchema.safeParse({ ...base, time: '8:30' }).success).toBe(false);
    expect(roundCoord(-9.15449)).toBe(-9.154);
  });

  it('quem vê', () => {
    const ctx = { friends: new Set(['f']), blocked: new Set(['b']), guest: false };
    const inv = (hostId: string, visibility: 'PUBLIC' | 'FRIENDS' | 'DIRECT', canceledAt: Date | null = null) => ({ hostId, visibility, canceledAt });
    expect(canSeeInvite(inv('x', 'PUBLIC'), 'me', ctx)).toBe(true);
    expect(canSeeInvite(inv('x', 'FRIENDS'), 'me', ctx)).toBe(false);
    expect(canSeeInvite(inv('f', 'FRIENDS'), 'me', ctx)).toBe(true);
    expect(canSeeInvite(inv('f', 'DIRECT'), 'me', ctx)).toBe(false);
    expect(canSeeInvite(inv('f', 'DIRECT'), 'me', { ...ctx, guest: true })).toBe(true);
    expect(canSeeInvite(inv('b', 'PUBLIC'), 'me', ctx)).toBe(false);
    expect(canSeeInvite(inv('x', 'PUBLIC', new Date()), 'me', ctx)).toBe(false);
  });

  it('distância Lisboa–Porto ≈ 274 km', () => {
    expect(Math.round(distanceKm({ lat: 38.7223, lng: -9.1393 }, { lat: 41.1579, lng: -8.6291 }))).toBe(274);
  });
});
