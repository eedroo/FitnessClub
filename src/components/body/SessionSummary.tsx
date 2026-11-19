import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDayMonth, formatLongDate, formatMonthYear } from '@/lib/dates';
import { formatGramsAsKg } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { SessionListItem, SessionSummary as Summary } from '@/lib/fitness/queries';
import { formatClock } from '@/lib/fitness/session';
import { compareTotals, compareWithPrevious, summarize } from '@/lib/fitness/progress';
import { DayMetrics } from './DayMetrics';
import { CompareCard } from './CompareCard';

const vals = (s: { reps: number | null; weightGrams: number | null; durationSec: number | null }) => ({
  reps: s.reps ?? undefined,
  weightGrams: s.weightGrams ?? undefined,
  durationSec: s.durationSec ?? undefined,
});

async function localeTools() {
  const raw = await getLocale();
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  return { locale, kg: (g: number) => formatGramsAsKg(g, intlLocale(locale)) };
}

/**
 * Resumo de uma sessão: números grandes, a comparação com a sessão anterior do mesmo treino (volume, carga máxima,
 * reps, séries) e, por exercício, as séries e a comparação com a última vez. `fresh` anima a entrada ao terminar.
 */
export async function SessionSummary({ summary, fresh }: { summary: Summary; fresh: boolean }) {
  const [t, { locale, kg }] = await Promise.all([getTranslations('fitness.summary'), localeTools()]);
  const prs = summary.byExercise.reduce((n, g) => n + g.sets.filter((s) => s.prKinds.length > 0).length, 0);
  // Os mesmos mosaicos do Dia, com a variação contra a última vez do mesmo treino dentro de cada número.
  const stats = {
    sets: summary.sets,
    reps: summary.reps,
    exercises: summary.exercises,
    volumeGrams: summary.volumeGrams,
    durationSec: summary.durationSec,
    sessionTimeSec: summary.durationSec,
    avgRestSec: summary.avgRestSec,
    prs,
  };
  return (
    <section className={`mg-session-summary${fresh ? ' mg-session-summary--fresh' : ''}`} aria-label={t('title')}>
      {fresh && <p className="mg-body-section-title">{t('well')}</p>}
      <p className="mg-session-row__meta">{formatLongDate(summary.date, locale)}</p>
      <DayMetrics
        stats={stats}
        hide={['session']}
        compare={summary.previous ? compareTotals(summary.totals, summary.previous.totals) : null}
        compareDates={summary.previous ? [summary.previous.date] : undefined}
      />
      <h2 className="mg-body-section-title">{t('byExercise')}</h2>
      {summary.byExercise.map(({ exercise, sets, previous }) => (
        <div key={exercise.id} className="mg-session-summary__ex">
          <Link href={`/exercises/${encodeURIComponent(exercise.id)}`} className="mg-session-row__name">
            {exercise.name}
          </Link>
          <span className="mg-session-row__meta">
            {sets
              .map((s) =>
                s.durationSec != null
                  ? t('secondsShort', { n: s.durationSec })
                  : s.weightGrams != null
                    ? `${t('kgValue', { kg: kg(s.weightGrams) })} × ${s.reps ?? 0}`
                    : String(s.reps ?? 0),
              )
              .join(', ')}
          </span>
          {previous ? (
            <CompareCard comparison={compareWithPrevious(summarize(sets.map(vals)), summarize(previous.sets.map(vals)))} />
          ) : (
            <span className="mg-session-row__meta">{t('firstTime')}</span>
          )}
        </div>
      ))}
    </section>
  );
}

export async function SessionRow({ session }: { session: SessionListItem }) {
  const [t, { locale }] = await Promise.all([getTranslations('fitness.sessions'), localeTools()]);
  return (
    <Link href={`/sessions/${session.id}`} className="mg-session-row">
      <span className="mg-session-row__text">
        <span className="mg-session-row__name">{session.name ?? t('free')}</span>
        <span className="mg-session-row__meta">{t('sets', { n: session.sets })}</span>
      </span>
      <span className="mg-session-row__time">
        {formatDayMonth(session.date, locale)} · {formatClock(session.durationSec)}
      </span>
    </Link>
  );
}

/** Sessões agrupadas por mês, mais recentes primeiro. */
export async function SessionList({ sessions }: { sessions: SessionListItem[] }) {
  const [t, { locale }] = await Promise.all([getTranslations('fitness.sessions'), localeTools()]);
  if (!sessions.length) return <p className="mg-body-empty">{t('empty')}</p>;
  const months = new Map<string, SessionListItem[]>();
  for (const s of sessions) {
    const k = s.date.slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), s]);
  }
  return (
    <>
      {[...months.entries()].map(([k, list]) => (
        <section key={k} aria-label={formatMonthYear(Number(k.slice(0, 4)), Number(k.slice(5, 7)), locale)}>
          <h2 className="mg-body-section-title">{formatMonthYear(Number(k.slice(0, 4)), Number(k.slice(5, 7)), locale)}</h2>
          <ul className="mg-session-list">
            {list.map((s) => (
              <li key={s.id}>
                <SessionRow session={s} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
