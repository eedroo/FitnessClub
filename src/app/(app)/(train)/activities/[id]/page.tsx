import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { todayInTz } from '@/lib/dates';
import { getActivityForm } from '@/lib/activities/queries';
import { BodyHeader } from '@/components/body/BodyHeader';
import { ActivityForm } from '@/components/activities/ActivityForm';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('activities');
  return { title: t('edit') };
}

/** Ver e editar uma atividade (ou apagá-la). */
export default async function ActivityPage({ params }: { params: { id: string } }) {
  const { userId } = await bodyPage();
  const [t, tf, user] = await Promise.all([
    getTranslations('activities'),
    getTranslations('fitness'),
    db.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);
  const tz = user?.timezone ?? 'Europe/Lisbon';
  const form = await getActivityForm(userId, params.id, tz);
  if (!form) notFound();
  return (
    <>
      <BodyHeader title={t(`types.${form.type}`)} backHref="/sessions" backLabel={tf('nav.sessions')} />
      <div className="mg-body-shell__main">
        <Link href={`/feed?share=activity:${form.id}`} className="mg-btn mg-btn--subtle mg-btn--block">
          {t('share')}
        </Link>
        <ActivityForm today={todayInTz(tz)} initial={form} />
      </div>
    </>
  );
}
