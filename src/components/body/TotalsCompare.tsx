'use client';

import { ArrowLeftRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatGramsAsKg } from '@/lib/weight';
import { formatDayMonth } from '@/lib/dates';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { Comparison, SessionTotals } from '@/lib/fitness/progress';

/**
 * Totais de uma sessão contra a última vez do mesmo treino: volume, carga máxima, reps e séries, com a data da anterior
 * (e o nome do treino, na tab Dia).
 * Mesmo desenho do `CompareCard` (▲ verde quando sobe; ▼ e igual neutros).
 */
export function TotalsCompare({ comparison, previousDate, name }: { comparison: Record<keyof SessionTotals, Comparison | null>; previousDate: string; name?: string }) {
  const t = useTranslations('fitness.compare');
  const raw = useLocale();
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const loc = intlLocale(locale);
  const kg = (g: number) => t('kg', { kg: formatGramsAsKg(g, loc) });
  const pctFmt = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
  const cells: { kind: string; key: keyof SessionTotals; fmt: (n: number) => string }[] = [
    { kind: 'volume', key: 'volumeGrams', fmt: kg },
    { kind: 'top', key: 'topWeightGrams', fmt: kg },
    { kind: 'reps', key: 'reps', fmt: String },
    { kind: 'sets', key: 'sets', fmt: String },
  ];
  const shown = cells.filter((c) => comparison[c.key]);
  if (!shown.length) return null;
  const title = name ? t('titleWorkout', { name, date: formatDayMonth(previousDate, locale) }) : t('titleTotals', { date: formatDayMonth(previousDate, locale) });
  return (
    <section className="mg-compare mg-compare--totals" aria-label={title}>
      <p className="mg-compare__head">
        <ArrowLeftRight size={16} aria-hidden="true" /> {title}
      </p>
      <dl className="mg-compare__grid">
        {shown.map(({ kind, key, fmt }) => {
          const c = comparison[key]!;
          const up = c.delta > 0;
          const pct = c.pct != null ? ` (${pctFmt.format(Math.abs(c.pct))} %)` : '';
          return (
            <div key={kind} className={`mg-compare__cell mg-compare__cell--${kind}`}>
              <span className="mg-compare__bar" aria-hidden="true" />
              <dt className="mg-compare__label">{t(`rows.${kind}`)}</dt>
              <dd className="mg-compare__value">{fmt(c.value)}</dd>
              <dd className={`mg-compare__delta${up ? ' mg-compare__delta--up' : ''}`}>
                {c.delta === 0 ? t('same') : <><span aria-hidden="true">{c.delta < 0 ? '▼' : '▲'}</span> {fmt(Math.abs(c.delta))}{pct}</>}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
