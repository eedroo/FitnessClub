import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { getSessionSummary } from '@/lib/fitness/queries';
import { BodyHeader } from '@/components/body/BodyHeader';
import { SessionSummary } from '@/components/body/SessionSummary';
import { sessionRewards } from '@/lib/gamification/server';
import { SessionRewards } from '@/components/gamification/SessionRewards';
import { db } from '@/lib/db';
import { QuickShare } from '@/components/social/QuickShare';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness.summary');
  return { title: t('title') };
}

/** Resumo de uma sessão; `?done=1` ao terminar (entrada animada). */
export default async function SessionSummaryRoute({ params, searchParams }: { params: { id: string }; searchParams: { done?: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, summary, rewards, shared] = await Promise.all([
    getTranslations('fitness'),
    getSessionSummary(userId, params.id, locale),
    sessionRewards(userId, params.id),
    db.post.count({ where: { authorId: userId, sessionId: params.id } }),
  ]);
  if (!summary) notFound();
  return (
    <>
      <BodyHeader title={summary.name ?? t('sessions.free')} backHref="/sessions" backLabel={t('nav.sessions')} />
      <div className="mg-body-shell__main">
        {rewards && <SessionRewards {...rewards} />}
        <SessionSummary summary={summary} fresh={searchParams.done === '1'} share={<QuickShare sessionId={summary.id} shared={shared > 0} />} />
      </div>
    </>
  );
}
