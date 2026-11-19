import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Bell, Flag, MapPin, Plus, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { ensureProfile, getFeed, unreadNotices } from '@/lib/social/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { PostCard } from '@/components/social/PostCard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social');
  return { title: t('feed') };
}

/** Feed: as publicações em destaque (todas ou só de amigos); o "+" abre a nova publicação. */
export default async function FeedPage({ searchParams }: { searchParams: { scope?: string; before?: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, tg, ti, profile] = await Promise.all([getTranslations('social'), getTranslations('groups'), getTranslations('invites'), ensureProfile(userId)]);
  const scope = searchParams.scope === 'friends' ? 'friends' : 'all';
  const before = searchParams.before && !Number.isNaN(Date.parse(searchParams.before)) ? new Date(searchParams.before) : undefined;
  const [posts, unread, pending] = await Promise.all([
    getFeed(userId, { scope, before }),
    unreadNotices(userId),
    db.friendship.count({ where: { addresseeId: userId, status: 'PENDING' } }),
  ]);
  const last = posts[posts.length - 1];

  return (
    <>
      <BodyHeader title={t('feed')} />
      <div className="mg-body-shell__main">
        <nav className="mg-feed-bar" aria-label={t('feed')}>
          <Link href="/corpo" className="mg-feed-bar__me">
            @{profile.handle}
          </Link>
          <Link href="/friends" className="mg-feed-bar__icon" aria-label={t('friends')}>
            <Users size={22} strokeWidth={1.75} aria-hidden="true" />
            {pending > 0 && <span className="mg-feed-bar__count">{pending}</span>}
          </Link>
          <Link href="/groups" className="mg-feed-bar__icon" aria-label={tg('title')}>
            <Flag size={22} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link href="/invites" className="mg-feed-bar__icon" aria-label={ti('title')}>
            <MapPin size={22} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link href="/feed/notices" className="mg-feed-bar__icon" aria-label={t('notices.title')}>
            <Bell size={22} strokeWidth={1.75} aria-hidden="true" />
            {unread > 0 && <span className="mg-feed-bar__count">{unread}</span>}
          </Link>
          <Link href="/feed/new" className="mg-feed-bar__icon mg-feed-bar__icon--new" aria-label={t('composer.title')}>
            <Plus size={22} strokeWidth={2} aria-hidden="true" />
          </Link>
        </nav>
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
