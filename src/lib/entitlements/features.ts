import type { FeatureRollout } from '@prisma/client';

/** Funcionalidades premium. Sem linha em `FeatureFlag`, vale o `defaultRollout` daqui. */
export type FeatureKey = 'pro';

export interface FeatureDef {
  key: FeatureKey;
  defaultRollout: FeatureRollout; // usado quando não há linha em FeatureFlag
}

export const FEATURES: Record<FeatureKey, FeatureDef> = {
  // O app inteiro (treinos, sessões, exercícios, peso e meta). O interruptor global e as excepções ficam no admin.
  pro: { key: 'pro', defaultRollout: 'PREMIUM' },
};

export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];
export const isFeatureKey = (k: string): k is FeatureKey => k in FEATURES;
