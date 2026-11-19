import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { formatDayMonth, fromDbDate } from '@/lib/dates';
import { ensureProfile } from '@/lib/social/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { PostComposer, type ShareOption } from '@/components/social/PostComposer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social.composer');
  return { title: t('title') };
}

/** Nova publicação (o "+" do Feed; `?share=session:<id>` ou `activity:<id>` vem dos resumos). */
export default async function NewPostPage({ searchParams }: { searchParams: { share?: string } }) {
  const { userId, locale } = await bodyPage();
  await ensureProfile(userId);
  const [t, ts, ta, tf, sessions, activities] = await Promise.all([
    getTranslations('social.composer'),
    getTranslations('social'),
    getTranslations('activities'),
    getTranslations('fitness'),
    db.fitnessSession.findMany({
      where: { userId, endedAt: { not: null }, sets: { some: {} } },
      orderBy: { startedAt: 'desc' },
      take: 8,
      select: { id: true, date: true, workout: { select: { name: true } } },
    }),
    db.activity.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 8, select: { id: true, date: true, type: true } }),
  ]);
  const options: ShareOption[] = [
    ...sessions.map((s) => ({ value: `session:${s.id}`, label: `${s.workout?.name ?? tf('sessions.free')} · ${formatDayMonth(fromDbDate(s.date), locale)}` })),
    ...activities.map((a) => ({ value: `activity:${a.id}`, label: `${ta(`types.${a.type}`)} · ${formatDayMonth(fromDbDate(a.date), locale)}` })),
  ];
  const share = searchParams.share && options.some((o) => o.value === searchParams.share) ? searchParams.share : '';
  return (
    <>
      <BodyHeader title={t('title')} backHref="/feed" backLabel={ts('feed')} historyBack />
      <div className="mg-body-shell__main">
        <PostComposer options={options} initialAttach={share} />
      </div>
    </>
  );
}
