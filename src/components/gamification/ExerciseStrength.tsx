import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { StrengthLevel } from '@/lib/gamification/strength';
import { StrengthTier } from './StrengthTier';

/** Na página do exercício: só o selo do nível de força (ex.: Bronze); tocar leva às conquistas, com o detalhe. */
export async function ExerciseStrength({ level }: { level: StrengthLevel | null }) {
  if (!level?.tier) return null;
  const t = await getTranslations('game');
  return (
    <Link href="/achievements" className="mg-strength-link" aria-label={`${t('strength.title')}: ${t(`tiers.${level.tier}`)}`}>
      <StrengthTier tier={level.tier} />
    </Link>
  );
}
