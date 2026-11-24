import type { BadgeId } from './badges';
import type { StrengthTier } from './strength';

/** Imagens da gamificação (em `public/game/`, 256 px WebP): moldura do nível por faixa, emblemas e medalhas de força. */
/**
 * Selos próprios dos níveis 1 a 25 (`public/game/levels/level-<n>.webp`, desenhados pela dona do projecto, já com o
 * número); acima disso, a moldura da faixa com o número escrito pela app. 0 = desligado (voltar às molduras).
 */
export const PER_LEVEL_ART = 25;

/** O selo do nível já traz o número desenhado (então a app não o escreve por cima). */
export const levelArtHasNumber = (level: number) => level >= 1 && level <= PER_LEVEL_ART;

export function levelFrame(level: number): string {
  if (levelArtHasNumber(level)) return `/game/levels/level-${level}.webp`;
  const band = level >= 100 ? 100 : level >= 50 ? 50 : level >= 25 ? 25 : level >= 10 ? 10 : 1;
  return `/game/level-${band}.webp`;
}

export const badgeArt = (id: BadgeId) => `/game/badge-${id}.webp`;
export const tierArt = (tier: StrengthTier) => `/game/tier-${tier}.webp`;

/** Arte de uma conquista partilhada num post (emblema, selo do nível, medalha de força ou da liga). */
export function achievementArt(a: { kind: 'badge'; id: string } | { kind: 'level'; level: number } | { kind: 'tier' | 'league'; tier: string }): string {
  if (a.kind === 'badge') return `/game/badge-${a.id}.webp`;
  if (a.kind === 'level') return levelFrame(a.level);
  return `/game/tier-${a.tier}.webp`;
}
