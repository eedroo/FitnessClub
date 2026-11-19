import { useTranslations } from 'next-intl';
import type { StrengthTier as Tier } from '@/lib/gamification/strength';

/** Selo pequeno do nível de força (bolinha na cor do nível + nome). Abaixo do bronze não mostra nada. */
export function StrengthTier({ tier, compact = false }: { tier: Tier | null; compact?: boolean }) {
  const t = useTranslations('game.tiers');
  if (!tier) return null;
  return (
    <span className={`mg-tier mg-tier--${tier}${compact ? ' mg-tier--compact' : ''}`} title={t(tier)}>
      <span className="mg-tier__dot" aria-hidden="true" />
      <span className="mg-tier__name">{t(tier)}</span>
    </span>
  );
}
