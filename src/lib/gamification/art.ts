import type { BadgeId } from './badges';
import type { StrengthTier } from './strength';

/** Imagens da gamificação (em `public/game/`, 256 px WebP): moldura do nível por faixa, emblemas e medalhas de força. */
/**
 * Molduras próprias para os primeiros níveis (`public/game/levels/level-<n>.webp`, n = 1…PER_LEVEL_ART); acima disso,
 * a moldura da faixa. 0 = ainda não há molduras por nível.
 */
export const PER_LEVEL_ART = 0;

export function levelFrame(level: number): string {
  if (level >= 1 && level <= PER_LEVEL_ART) return `/game/levels/level-${level}.webp`;
  const band = level >= 100 ? 100 : level >= 50 ? 50 : level >= 25 ? 25 : level >= 10 ? 10 : 1;
  return `/game/level-${band}.webp`;
}

export const badgeArt = (id: BadgeId) => `/game/badge-${id}.webp`;
export const tierArt = (tier: StrengthTier) => `/game/tier-${tier}.webp`;
