import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { listSessions } from '@/lib/fitness/queries';
import { listActivities } from '@/lib/activities/queries';
import Link from 'next/link';
import { BodyHeader } from '@/components/body/BodyHeader';
import { SessionList } from '@/components/body/SessionSummary';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness.sessions');
  return { title: t('title') };
}

export default async function SessionsRoute() {
  const { userId } = await bodyPage();
  const [t, ta, sessions, activities] = await Promise.all([getTranslations('fitness.sessions'), getTranslations('activities'), listSessions(userId), listActivities(userId)]);
  return (
    <>
      <BodyHeader title={t('title')} />
      <div className="mg-body-shell__main">
        <Link href="/activities/new" className="mg-btn mg-btn--subtle mg-btn--block">
          {ta('add')}
        </Link>
        <SessionList sessions={sessions} activities={activities} />
      </div>
    </>
  );
}
