import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { StrengthTier as Tier } from '@/lib/gamification/strength';
import { tierArt } from '@/lib/gamification/art';

/** Selo pequeno do nível de força (medalha + nome). Abaixo do bronze não mostra nada. */
export function StrengthTier({ tier, compact = false, large = false }: { tier: Tier | null; compact?: boolean; large?: boolean }) {
  const t = useTranslations('game.tiers');
  if (!tier) return null;
  return (
    <span className={`mg-tier mg-tier--${tier}${compact ? ' mg-tier--compact' : ''}${large ? ' mg-tier--large' : ''}`} title={t(tier)}>
      <Image className="mg-tier__medal" src={tierArt(tier)} alt="" width={large ? 40 : 20} height={large ? 40 : 20} />
      <span className="mg-tier__name">{t(tier)}</span>
    </span>
  );
}
