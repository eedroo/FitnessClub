import { describe, expect, it } from 'vitest';
import { buildEntitlements, canUse, effectivePlan } from './entitlements';

const now = new Date('2026-11-02T12:00:00Z');
const yesterday = new Date('2026-11-01T12:00:00Z');

describe('direitos', () => {
  it('effectivePlan: PREMIUM sem fim mantém-se; com fim ontem passa a FREE', () => {
    expect(effectivePlan({ plan: 'PREMIUM', planExpiresAt: null }, now)).toBe('PREMIUM');
    expect(effectivePlan({ plan: 'PREMIUM', planExpiresAt: yesterday }, now)).toBe('FREE');
    expect(effectivePlan({ plan: 'FREE', planExpiresAt: null }, now)).toBe('FREE');
  });

  it('canUse: interruptor global e excepções', () => {
    expect(canUse('pro', { plan: 'PREMIUM', rollout: 'HIDDEN', override: null })).toBe(false);
    expect(canUse('pro', { plan: 'FREE', rollout: 'HIDDEN', override: true })).toBe(true);
    expect(canUse('pro', { plan: 'FREE', rollout: 'PREMIUM', override: null })).toBe(false);
    expect(canUse('pro', { plan: 'PREMIUM', rollout: 'PREMIUM', override: null })).toBe(true);
    expect(canUse('pro', { plan: 'PREMIUM', rollout: 'ALL', override: false })).toBe(false);
    expect(canUse('pro', { plan: 'FREE', rollout: 'ALL', override: null })).toBe(true);
  });

  it('buildEntitlements: sem linha de FeatureFlag usa o defaultRollout (ALL: aberto a todos)', () => {
    expect(buildEntitlements({ plan: 'FREE', planExpiresAt: null }, {}, {}, now)).toEqual({ plan: 'FREE', features: { pro: true, ai: false } });
    expect(buildEntitlements({ plan: 'FREE', planExpiresAt: null }, { pro: 'PREMIUM' }, {}, now).features.pro).toBe(false);
    expect(buildEntitlements({ plan: 'PREMIUM', planExpiresAt: null }, { pro: 'PREMIUM' }, {}, now).features.pro).toBe(true);
    // Interruptor global em "Todos": grátis também usa.
    expect(buildEntitlements({ plan: 'FREE', planExpiresAt: null }, { pro: 'ALL' }, {}, now).features.pro).toBe(true);
    // Excepção por pessoa com a funcionalidade escondida para todos.
    expect(buildEntitlements({ plan: 'FREE', planExpiresAt: null }, { pro: 'HIDDEN' }, { pro: true }, now).features).toEqual({ pro: true, ai: false });
    // IA: só premium por defeito.
    expect(buildEntitlements({ plan: 'PREMIUM', planExpiresAt: null }, {}, {}, now).features.ai).toBe(true);
    // Premium expirado conta como grátis.
    expect(buildEntitlements({ plan: 'PREMIUM', planExpiresAt: yesterday }, {}, {}, now).plan).toBe('FREE');
  });
});
