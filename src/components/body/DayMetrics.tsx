import { getLocale, getTranslations } from 'next-intl/server';
import { formatGramsAsKg } from '@/lib/weight';
import { formatClock } from '@/lib/fitness/session';
import { formatDayMonth, type DateISO } from '@/lib/dates';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { Comparison, DayStats, SessionTotals } from '@/lib/fitness/progress';

const clock = (s: number) => formatClock(s).replace(/^0(\d):/, '$1:');

/**
 * Métricas do dia (ou de uma sessão) em grelha de 2 colunas, cada uma com a sua cor fixa. Com `compare`, as que se
 * comparam (séries, reps, volume e carga máxima) mostram por baixo a variação contra a última vez do mesmo treino
 * (▲ verde quando sobe; ▼ e "igual" neutros) e uma nota no fim diz com que data(s).
 */
export async function DayMetrics({
  stats,
  compare,
  compareDates,
  hide = [],
}: {
  stats: DayStats;
  /** Mosaicos a esconder (ex.: no resumo de uma sessão, "tempo de sessão" repete a duração). */
  hide?: string[];
  compare?: Record<keyof SessionTotals, Comparison | null> | null;
  compareDates?: DateISO[];
}) {
  const [t, tc, raw] = await Promise.all([getTranslations('fitness.day.metrics'), getTranslations('fitness.compare'), getLocale()]);
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const loc = intlLocale(locale);
  const kg = (g: number) => t('kg', { kg: formatGramsAsKg(g, loc) });
  const pct = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
  const delta = (c: Comparison | null | undefined, fmt: (n: number) => string) => {
    if (!c) return null;
    if (c.delta === 0) return { up: false, text: tc('same') };
    return { up: c.delta > 0, text: `${c.delta < 0 ? '▼' : '▲'} ${fmt(Math.abs(c.delta))}${c.pct != null ? ` (${pct.format(Math.abs(c.pct))} %)` : ''}` };
  };
  const items: { kind: string; value: string; delta?: { up: boolean; text: string } | null }[] = [
    { kind: 'sets', value: String(stats.sets), delta: delta(compare?.sets, String) },
    { kind: 'reps', value: String(stats.reps), delta: delta(compare?.reps, String) },
    { kind: 'exercises', value: String(stats.exercises) },
    { kind: 'volume', value: kg(stats.volumeGrams), delta: delta(compare?.volumeGrams, kg) },
    ...(compare?.topWeightGrams ? [{ kind: 'top', value: kg(compare.topWeightGrams.value), delta: delta(compare.topWeightGrams, kg) }] : []),
    { kind: 'duration', value: stats.durationSec != null ? clock(stats.durationSec) : '–' },
    { kind: 'rest', value: stats.avgRestSec != null ? clock(stats.avgRestSec) : '–' },
    { kind: 'session', value: clock(stats.sessionTimeSec) },
    { kind: 'prs', value: String(stats.prs) },
  ];
  return (
    <div className="mg-day-metrics__wrap">
      <ul className="mg-day-metrics">
        {items.filter((m) => !hide.includes(m.kind)).map((m) => (
          <li key={m.kind} className={`mg-day-metrics__metric mg-day-metrics__metric--${m.kind}`}>
            <span className="mg-day-metrics__label">{t(m.kind)}</span>
            <span className="mg-day-metrics__value">{m.value}</span>
            {m.delta && <span className={`mg-day-metrics__delta${m.delta.up ? ' mg-day-metrics__delta--up' : ''}`}>{m.delta.text}</span>}
          </li>
        ))}
      </ul>
      {compare && compareDates?.length ? (
        <p className="mg-day-metrics__note">{tc('note', { dates: compareDates.map((d) => formatDayMonth(d, locale)).join(', ') })}</p>
      ) : null}
    </div>
  );
}
