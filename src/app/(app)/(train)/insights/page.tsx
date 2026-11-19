import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { fromDbDate, addDays, formatDateRange, todayInTz, toDbDate } from '@/lib/dates';
import { lastFinishedWeekStart } from '@/lib/weeks';
import { bodyPage } from '@/lib/fitness/page';
import { getAiAccess } from '@/lib/ai/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { InsightButton } from '@/components/ai/InsightButton';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ai.insights');
  return { title: t('title') };
}

/** Retrospectivas semanais: pedir a da última semana e ver as anteriores. */
export default async function InsightsPage() {
  const { userId, locale } = await bodyPage();
  const [t, tf, access, user, list] = await Promise.all([
    getTranslations('ai.insights'),
    getTranslations('fitness'),
    getAiAccess(userId),
    db.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
    db.aiRequest.findMany({
      where: { userId, kind: 'INSIGHT', status: { in: ['DONE', 'PENDING'] } },
      orderBy: { weekStart: 'desc' },
      take: 26,
      select: { id: true, weekStart: true, status: true, result: true, readAt: true },
    }),
  ]);
  const lastWeek = lastFinishedWeekStart(todayInTz(user?.timezone ?? 'Europe/Lisbon'));
  const hasLast = list.some((r) => r.weekStart && r.weekStart.getTime() === toDbDate(lastWeek).getTime());

  return (
    <>
      <BodyHeader title={t('title')} backHref="/" backLabel={tf('nav.workouts')} />
      <div className="mg-body-shell__main">
        <p className="mg-ai-program__desc">{access.feature ? t('intro') : t('premium')}</p>
        {access.feature && access.configured && !hasLast && <InsightButton consent={access.consent} />}
        {list.length > 0 ? (
          <ul className="mg-program-list">
            {list.map((r) => {
              const start = fromDbDate(r.weekStart!);
              const headline = (r.result as { headline?: string } | null)?.headline;
              return (
                <li key={r.id}>
                  <Link href={`/insights/${r.id}`} className="mg-program-row">
                    <span className="mg-program-row__text">
                      <span className="mg-program-row__name">
                        {!r.readAt && r.status === 'DONE' && <span className="mg-ai-dot" aria-label={t('unread')} />}
                        {formatDateRange(start, addDays(start, 6), locale)}
                      </span>
                      <span className="mg-program-row__meta">{headline ?? t('pending')}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          access.feature && <p className="mg-notes__empty">{t('empty')}</p>
        )}
      </div>
    </>
  );
}
