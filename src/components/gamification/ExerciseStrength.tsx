import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { StrengthLevel } from '@/lib/gamification/strength';
import { tierArt } from '@/lib/gamification/art';

/** Na página do exercício: o nível de força nele (medalha, valor, próximo nível e barra). Só a pessoa vê. */
export async function ExerciseStrength({ level, needsWeight, locale }: { level: StrengthLevel | null; needsWeight: boolean; locale: string }) {
  const t = await getTranslations('game');
  if (!level) {
    return needsWeight ? (
      <Link href="/weight" className="mg-strength-card mg-strength-card--empty">
        <span className="mg-strength-card__label">{t('strength.title')}</span>
        <span className="mg-strength-card__meta">{t('strength.needsWeight')}</span>
      </Link>
    ) : null;
  }
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const value = (v: number) => (level.by === 'ratio' ? t('strength.ratio', { v: num.format(v) }) : t('strength.reps', { n: v }));
  return (
    <Link href="/achievements" className="mg-strength-card">
      {level.tier ? (
        <Image className="mg-strength-card__medal" src={tierArt(level.tier)} alt="" width={56} height={56} />
      ) : (
        <span className="mg-strength-card__medal mg-strength-card__medal--none" aria-hidden="true" />
      )}
      <span className="mg-strength-card__text">
        <span className="mg-strength-card__label">{t('strength.title')}</span>
        <span className="mg-strength-card__tier">{level.tier ? t(`tiers.${level.tier}`) : t('strength.belowBronze')}</span>
        <span className="mg-strength-card__meta">
          {value(level.value)}
          {level.next != null && ` · ${t('strength.next', { v: value(level.next) })}`}
        </span>
        <span className="mg-badges__bar" aria-hidden="true">
          <span className={`mg-badges__fill mg-game__fill--${level.tier ?? 'none'}`} style={{ width: `${Math.round(level.progress * 100)}%` }} />
        </span>
      </span>
    </Link>
  );
}
