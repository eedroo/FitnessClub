import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Bell, UserPen, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { formatDayMonth } from '@/lib/dates';
import { getFeed, getMyProfile, unreadNotices } from '@/lib/social/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { JoinCommunity } from '@/components/social/JoinCommunity';
import { PostCard } from '@/components/social/PostCard';
import { PostComposer, type ShareOption } from '@/components/social/PostComposer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social');
  return { title: t('feed') };
}

/** Feed: entrar na comunidade; depois escrever, partilhar um treino e ver os posts (todos ou só amigos). */
export default async function FeedPage({ searchParams }: { searchParams: { share?: string; scope?: string; before?: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, ta, tf, profile, user] = await Promise.all([
    getTranslations('social'),
    getTranslations('activities'),
    getTranslations('fitness'),
    getMyProfile(userId),
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
  if (!profile) {
    return (
      <>
        <BodyHeader title={t('feed')} />
        <div className="mg-body-shell__main">
          <JoinCommunity initial={{ handle: '', displayName: user?.name ?? '', bio: '' }} />
        </div>
      </>
    );
  }
  const scope = searchParams.scope === 'friends' ? 'friends' : 'all';
  const before = searchParams.before && !Number.isNaN(Date.parse(searchParams.before)) ? new Date(searchParams.before) : undefined;
  const [posts, unread, pending, sessions, activities] = await Promise.all([
    getFeed(userId, { scope, before }),
    unreadNotices(userId),
    db.friendship.count({ where: { addresseeId: userId, status: 'PENDING' } }),
    db.fitnessSession.findMany({
      where: { userId, endedAt: { not: null }, sets: { some: {} } },
      orderBy: { startedAt: 'desc' },
      take: 8,
      select: { id: true, date: true, workout: { select: { name: true } } },
    }),
    db.activity.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 8, select: { id: true, date: true, type: true } }),
  ]);
  const options: ShareOption[] = [
    ...sessions.map((s) => ({ value: `session:${s.id}`, label: `${s.workout?.name ?? tf('sessions.free')} · ${formatDayMonth(s.date.toISOString().slice(0, 10), locale)}` })),
    ...activities.map((a) => ({ value: `activity:${a.id}`, label: `${ta(`types.${a.type}`)} · ${formatDayMonth(a.date.toISOString().slice(0, 10), locale)}` })),
  ];
  const share = searchParams.share && options.some((o) => o.value === searchParams.share) ? searchParams.share : '';
  const last = posts[posts.length - 1];

  return (
    <>
      <BodyHeader title={t('feed')} />
      <div className="mg-body-shell__main">
        <nav className="mg-feed-bar" aria-label={t('feed')}>
          <Link href={`/u/${profile.handle}`} className="mg-feed-bar__me">
            @{profile.handle}
          </Link>
          <Link href="/friends" className="mg-feed-bar__icon" aria-label={t('friends')}>
            <Users size={22} strokeWidth={1.75} aria-hidden="true" />
            {pending > 0 && <span className="mg-feed-bar__count">{pending}</span>}
          </Link>
          <Link href="/feed/notices" className="mg-feed-bar__icon" aria-label={t('notices.title')}>
            <Bell size={22} strokeWidth={1.75} aria-hidden="true" />
            {unread > 0 && <span className="mg-feed-bar__count">{unread}</span>}
          </Link>
          <Link href="/feed/profile" className="mg-feed-bar__icon" aria-label={t('edit.title')}>
            <UserPen size={22} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </nav>
        <PostComposer options={options} initialAttach={share} />
        <div className="mg-feed-scope" role="tablist" aria-label={t('scope.label')}>
          <Link href="/feed" role="tab" aria-selected={scope === 'all'} className={scope === 'all' ? 'mg-feed-scope__tab mg-feed-scope__tab--on' : 'mg-feed-scope__tab'}>
            {t('scope.all')}
          </Link>
          <Link href="/feed?scope=friends" role="tab" aria-selected={scope === 'friends'} className={scope === 'friends' ? 'mg-feed-scope__tab mg-feed-scope__tab--on' : 'mg-feed-scope__tab'}>
            {t('scope.friends')}
          </Link>
        </div>
        {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} locale={locale} />) : <p className="mg-body-empty">{t('empty')}</p>}
        {posts.length === 30 && last && (
          <Link href={`/feed?${scope === 'friends' ? 'scope=friends&' : ''}before=${encodeURIComponent(last.createdAt)}`} className="mg-btn mg-btn--subtle mg-btn--block">
            {t('more')}
          </Link>
        )}
      </div>
    </>
  );
}
