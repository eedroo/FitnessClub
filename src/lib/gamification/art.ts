import type { BadgeId } from './badges';
import type { StrengthTier } from './strength';

/** Imagens da gamificação (em `public/game/`, 256 px WebP): moldura do nível por faixa, emblemas e medalhas de força. */
export function levelFrame(level: number): string {
  const band = level >= 100 ? 100 : level >= 50 ? 50 : level >= 25 ? 25 : level >= 10 ? 10 : 1;
  return `/game/level-${band}.webp`;
}

export const badgeArt = (id: BadgeId) => `/game/badge-${id}.webp`;
export const tierArt = (tier: StrengthTier) => `/game/tier-${tier}.webp`;
