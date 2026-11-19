import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { ensureProfile, getFriendsPage, searchProfiles } from '@/lib/social/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { Avatar } from '@/components/social/Avatar';
import { FriendRequestButtons } from '@/components/social/FriendRequestRow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social');
  return { title: t('friends') };
}

/** Amigos: procurar pelo @ ou nome, pedidos recebidos e enviados, e a lista de amigos. */
export default async function FriendsPage({ searchParams }: { searchParams: { q?: string } }) {
  const { userId } = await bodyPage();
  await ensureProfile(userId);
  const q = (searchParams.q ?? '').slice(0, 40);
  const [t, data, found] = await Promise.all([getTranslations('social'), getFriendsPage(userId), q ? searchProfiles(userId, q) : Promise.resolve([])]);
  const row = (p: { handle: string; displayName: string; avatarUrl: string | null }, extra?: React.ReactNode) => (
    <li key={p.handle} className="mg-program-row mg-friend-row">
      <Link href={`/u/${p.handle}`} className="mg-friend-row__who">
        <Avatar name={p.displayName} url={p.avatarUrl} size={36} />
        <span className="mg-program-row__text">
          <span className="mg-program-row__name">{p.displayName}</span>
          <span className="mg-program-row__meta">@{p.handle}</span>
        </span>
      </Link>
      {extra}
    </li>
  );
  return (
    <>
      <BodyHeader title={t('friends')} backHref="/feed" backLabel={t('feed')} />
      <div className="mg-body-shell__main">
        <form action="/friends" className="mg-friend-search" role="search">
          <input className="mg-input" type="search" name="q" defaultValue={q} placeholder={t('search')} aria-label={t('search')} autoCapitalize="none" />
        </form>
        {q && (
          <>
            <h2 className="mg-body-section-title">{t('results')}</h2>
            {found.length ? <ul className="mg-program-list">{found.map((p) => row(p))}</ul> : <p className="mg-notes__empty">{t('noResults')}</p>}
          </>
        )}
        {data.incoming.length > 0 && (
          <>
            <h2 className="mg-body-section-title">{t('requests')}</h2>
            <ul className="mg-program-list">{data.incoming.map((p) => row(p, <FriendRequestButtons friendshipId={p.id} />))}</ul>
          </>
        )}
        <h2 className="mg-body-section-title">{t('friendsList', { n: data.friends.length })}</h2>
        {data.friends.length ? <ul className="mg-program-list">{data.friends.map((p) => row(p))}</ul> : <p className="mg-notes__empty">{t('noFriends')}</p>}
        {data.outgoing.length > 0 && (
          <>
            <h2 className="mg-body-section-title">{t('sent')}</h2>
            <ul className="mg-program-list">{data.outgoing.map((p) => row(p))}</ul>
          </>
        )}
      </div>
    </>
  );
}
