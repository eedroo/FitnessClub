import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { addDays, formatDateRange, fromDbDate } from '@/lib/dates';
import { bodyPage } from '@/lib/fitness/page';
import { insightSchema, type WeekFacts } from '@/lib/ai/insights';
import { AI_JOB_TIMEOUT_MS } from '@/lib/ai/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { AiPendingRefresh } from '@/components/ai/AiPendingRefresh';
import { InsightRead } from '@/components/ai/InsightRead';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ai.insights');
  return { title: t('title') };
}

/** Uma retrospectiva: os números da semana (calculados pela app) e a leitura da IA. */
export default async function InsightPage({ params }: { params: { id: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, req] = await Promise.all([
    getTranslations('ai.insights'),
    db.aiRequest.findFirst({ where: { id: params.id, userId, kind: 'INSIGHT' }, select: { id: true, status: true, weekStart: true, facts: true, result: true, createdAt: true } }),
  ]);
  if (!req || !req.weekStart) notFound();
  if (req.status === 'PENDING' && Date.now() - req.createdAt.getTime() > AI_JOB_TIMEOUT_MS) {
    await db.aiRequest.updateMany({ where: { id: req.id, status: 'PENDING' }, data: { status: 'FAILED', error: 'sem resposta do job', finishedAt: new Date() } });
    req.status = 'FAILED';
  }
  const start = fromDbDate(req.weekStart);
  const range = formatDateRange(start, addDays(start, 6), locale);
  const facts = req.facts as WeekFacts | null;
  const insight = req.status === 'DONE' ? insightSchema.safeParse(req.result) : null;
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const delta = (cur: number, prev: number, unit = '') => {
    const d = Math.round((cur - prev) * 10) / 10;
    if (d === 0) return { text: '=', up: false };
    return { text: `${d > 0 ? '▲' : '▼'} ${num.format(Math.abs(d))}${unit}`, up: d > 0 };
  };
  const tiles = facts
    ? [
        { kind: 'session', label: t('facts.sessions'), value: num.format(facts.sessions), d: delta(facts.sessions, facts.prevSessions), sub: facts.plannedDays ? t('facts.planned', { n: facts.plannedDays }) : null },
        { kind: 'volume', label: t('facts.volume'), value: `${num.format(facts.volumeKg)} kg`, d: delta(facts.volumeKg, facts.prevVolumeKg, ' kg'), sub: null },
        { kind: 'sets', label: t('facts.sets'), value: num.format(facts.sets), d: delta(facts.sets, facts.prevSets), sub: null },
        { kind: 'prs', label: t('facts.prs'), value: num.format(facts.prs.length), d: null, sub: null },
      ]
    : [];

  return (
    <>
      <BodyHeader title={range} backHref="/insights" backLabel={t('title')} />
      <div className="mg-body-shell__main">
        <p className="mg-ai-program__badge">
          <MagicIcon name="sparkles" size="sm" decorative /> {t('title')}
        </p>
        {tiles.length > 0 && (
          <ul className="mg-day-metrics">
            {tiles.map((tile) => (
              <li key={tile.kind} className={`mg-day-metrics__metric mg-day-metrics__metric--${tile.kind}`}>
                <span className="mg-day-metrics__label">{tile.label}</span>
                <span className="mg-day-metrics__value">{tile.value}</span>
                {tile.d && (
                  <span className={tile.d.up ? 'mg-day-metrics__delta mg-day-metrics__delta--up' : 'mg-day-metrics__delta'}>{tile.d.text}</span>
                )}
                {tile.sub && <span className="mg-day-metrics__delta">{tile.sub}</span>}
              </li>
            ))}
          </ul>
        )}
        {facts && <p className="mg-day-metrics__note">{t('facts.note')}</p>}

        {req.status === 'PENDING' && (
          <div className="mg-ai-wait" role="status" aria-live="polite">
            <span className="mg-ai-wait__icon" aria-hidden="true">
              <MagicIcon name="sparkles" size="md" decorative />
            </span>
            <p className="mg-ai-wait__title">{t('pendingTitle')}</p>
            <AiPendingRefresh />
          </div>
        )}
        {req.status === 'FAILED' && (
          <div className="mg-ai-wait" role="alert">
            <p className="mg-ai-wait__title">{t('failed')}</p>
          </div>
        )}
        {insight?.success && (
          <>
            <InsightRead id={req.id} />
            <div className="mg-ai-program">
              <h2 className="mg-ai-program__name">{insight.data.headline}</h2>
              <p className="mg-ai-program__notes">{insight.data.summary}</p>
            </div>
            {insight.data.wins.length > 0 && (
              <section className="mg-ai-workout" aria-label={t('wins')}>
                <h3 className="mg-ai-workout__name">{t('wins')}</h3>
                <ul className="mg-ai-insight__list">
                  {insight.data.wins.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </section>
            )}
            <section className="mg-ai-workout" aria-label={t('improve')}>
              <h3 className="mg-ai-workout__name">{t('improve')}</h3>
              <ul className="mg-ai-insight__list">
                {insight.data.improve.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>
            <section className="mg-ai-workout mg-ai-workout--focus" aria-label={t('nextWeek')}>
              <h3 className="mg-ai-workout__name">{t('nextWeek')}</h3>
              <p className="mg-ai-workout__notes">{insight.data.nextWeek}</p>
            </section>
            <p className="mg-ai-program__hint">{t('disclaimer')}</p>
          </>
        )}
      </div>
    </>
  );
}
