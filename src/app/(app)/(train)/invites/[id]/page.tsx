import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { isActivityType } from '@/lib/activities/types';
import { friendIds } from '@/lib/social/server';
import { getInvite } from '@/lib/social/invites-server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { Avatar } from '@/components/social/Avatar';
import { ActivityIcon } from '@/components/activities/ActivityIcon';
import { MapClient } from '@/components/invites/MapClient';
import { InviteActions, RequestButtons } from '@/components/invites/InviteActions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invites');
  return { title: t('title') };
}

/** Um treino marcado: o quê, quando, onde (pino no mapa), quem vai e as acções. */
export default async function InvitePage({ params }: { params: { id: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, ta, data, user, friends] = await Promise.all([
    getTranslations('invites'),
    getTranslations('activities'),
    getInvite(userId, params.id),
    db.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
    friendIds(userId),
  ]);
  if (!data) notFound();
  const { invite: i, people } = data;
  const type = isActivityType(i.activityType) ? i.activityType : 'other';
  const when = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: user?.timezone ?? 'Europe/Lisbon' });
  const past = new Date(i.startsAt).getTime() < Date.now();
  const canAsk = i.visibility === 'PUBLIC' || (i.visibility === 'FRIENDS' && friends.has(i.host.id));
  const going = people.filter((p) => p.status === 'GOING');
  const requests = people.filter((p) => p.status === 'REQUESTED');
  const pending = people.filter((p) => p.status === 'INVITED');
  const row = (p: { userId: string; handle: string; displayName: string; avatarUrl: string | null }, extra?: React.ReactNode) => (
    <li key={p.userId} className="mg-program-row mg-friend-row">
      <Link href={p.userId === userId ? '/corpo' : `/u/${p.handle}`} className="mg-friend-row__who">
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
      <BodyHeader title={i.title} backHref="/invites" backLabel={t('title')} historyBack />
      <div className="mg-body-shell__main">
        {i.canceled && <p className="mg-post__hidden">{t('canceledLong')}</p>}
        <div className="mg-invite-head">
          <ActivityIcon type={type} size={22} />
          <span className="mg-program-row__text">
            <span className="mg-program-row__name">{ta(`types.${type}`)}</span>
            <span className="mg-program-row__meta">
              {when.format(new Date(i.startsAt))}
              {i.durationMin ? ` · ${t('minutes', { n: i.durationMin })}` : ''}
            </span>
            <span className="mg-program-row__meta">
              {t(`visibility.${i.visibility}`)} · {t('going', { n: i.going })}
              {i.maxPeople ? ` / ${i.maxPeople}` : ''}
            </span>
          </span>
        </div>
        <p className="mg-invite-place">{i.place.name}</p>
        <MapClient pins={[{ id: i.id, lat: i.place.lat, lng: i.place.lng, label: i.place.name }]} />
        <a className="mg-btn mg-btn--subtle mg-btn--block" href={`https://www.openstreetmap.org/?mlat=${i.place.lat}&mlon=${i.place.lng}#map=16/${i.place.lat}/${i.place.lng}`} target="_blank" rel="noreferrer">
          {t('openMap')}
        </a>
        {i.description && <p className="mg-post__text">{i.description}</p>}
        <InviteActions inviteId={i.id} mine={i.mine} status={i.myStatus} canceled={i.canceled} past={past} canAsk={canAsk} />
        <h2 className="mg-body-section-title">{t('who')}</h2>
        <ul className="mg-program-list">
          {row({ userId: i.host.id, ...i.host }, <span className="mg-program-row__meta">{t('host')}</span>)}
          {going.map((p) => row(p))}
        </ul>
        {i.mine && requests.length > 0 && (
          <>
            <h2 className="mg-body-section-title">{t('requests')}</h2>
            <ul className="mg-program-list">{requests.map((p) => row(p, <RequestButtons inviteId={i.id} userId={p.userId} />))}</ul>
          </>
        )}
        {i.mine && pending.length > 0 && (
          <>
            <h2 className="mg-body-section-title">{t('waiting')}</h2>
            <ul className="mg-program-list">{pending.map((p) => row(p))}</ul>
          </>
        )}
      </div>
    </>
  );
}
