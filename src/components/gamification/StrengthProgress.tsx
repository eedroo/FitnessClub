import { getLocale, getTranslations } from 'next-intl/server';
import { STRENGTH_TIERS, type StrengthLevel } from '@/lib/gamification/strength';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import { formatGramsAsKg } from '@/lib/weight';

/**
 * Em "Detalhes e ações" da página do exercício: o caminho até à medalha seguinte, em números da pessoa
 * (1RM estimado em kg, repetições ou segundos) e o que falta. O selo continua por cima, fora dos detalhes.
 */
export async function StrengthProgress({
  level,
  e1rmGrams,
  bodyGrams,
  dumbbells,
}: {
  level: StrengthLevel;
  e1rmGrams: number | null;
  bodyGrams: number | null;
  dumbbells: boolean;
}) {
  const [t, raw] = await Promise.all([getTranslations('game'), getLocale()]);
  const locale = intlLocale(isAppLocale(raw) ? raw : 'pt-PT');
  const kg = (g: number) => `${formatGramsAsKg(Math.round(g / 500) * 500, locale)} kg`;
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const idx = level.tier ? STRENGTH_TIERS.indexOf(level.tier) : -1;
  const nextTier = STRENGTH_TIERS[idx + 1] ?? null;

  let now: string;
  let goal: string | null = null;
  if (level.by === 'ratio') {
    now = t('strength.e1rmNow', { kg: kg(e1rmGrams ?? 0), ratio: num.format(level.value) });
    if (level.next != null && bodyGrams) {
      const target = level.next * bodyGrams;
      goal = t('strength.goal', { tier: t(`tiers.${nextTier}`), target: kg(target), missing: kg(Math.max(0, target - (e1rmGrams ?? 0))) });
    }
  } else {
    const unit = (n: number) => (level.by === 'sec' ? t('strength.sec', { n }) : t('strength.reps', { n }));
    now = t('strength.bestNow', { v: unit(level.value) });
    if (level.next != null) goal = t('strength.goal', { tier: t(`tiers.${nextTier}`), target: unit(level.next), missing: unit(level.next - level.value) });
  }

  return (
    <div className="mg-strength-progress">
      <p className="mg-strength-progress__title">{t('strength.title')}</p>
      <p className="mg-strength-progress__line">{now}</p>
      <span className="mg-badges__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level.progress * 100)}>
        <span className={`mg-badges__fill mg-game__fill--${level.tier ?? 'none'}`} style={{ width: `${Math.round(level.progress * 100)}%` }} />
      </span>
      <p className="mg-strength-progress__line">{goal ?? t('strength.top')}</p>
      {dumbbells && level.by === 'ratio' && <p className="mg-strength-progress__hint">{t('strength.dumbbells')}</p>}
    </div>
  );
}
