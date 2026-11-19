import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { isActivityType } from '@/lib/activities/types';
import { listInvites } from '@/lib/social/invites-server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { ActivityIcon } from '@/components/activities/ActivityIcon';
import { MapClient } from '@/components/invites/MapClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invites');
  return { title: t('title') };
}

/** Treinos marcados: os próximos que posso ver (meus, convites, de amigos e públicos), em lista ou no mapa. */
export default async function InvitesPage({ searchParams }: { searchParams: { view?: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, ts, ta, invites, user] = await Promise.all([
    getTranslations('invites'),
    getTranslations('social'),
    getTranslations('activities'),
    listInvites(userId),
    db.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);
  const map = searchParams.view === 'map';
  const when = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: user?.timezone ?? 'Europe/Lisbon' });
  const live = invites.filter((i) => !i.canceled);
  return (
    <>
      <BodyHeader title={t('title')} backHref="/feed" backLabel={ts('feed')} />
      <div className="mg-body-shell__main">
        <Link href="/invites/new" className="mg-btn mg-btn--primary mg-btn--block">
          {t('new')}
        </Link>
        <div className="mg-feed-scope" role="tablist" aria-label={t('title')}>
          <Link href="/invites" role="tab" aria-selected={!map} className={!map ? 'mg-feed-scope__tab mg-feed-scope__tab--on' : 'mg-feed-scope__tab'}>
            {t('list')}
          </Link>
          <Link href="/invites?view=map" role="tab" aria-selected={map} className={map ? 'mg-feed-scope__tab mg-feed-scope__tab--on' : 'mg-feed-scope__tab'}>
            {t('mapTab')}
          </Link>
        </div>
        {map ? (
          <MapClient locate pins={live.map((i) => ({ id: i.id, lat: i.place.lat, lng: i.place.lng, label: `${i.title} · ${when.format(new Date(i.startsAt))}`, href: `/invites/${i.id}` }))} />
        ) : invites.length ? (
          <ul className="mg-program-list">
            {invites.map((i) => {
              const type = isActivityType(i.activityType) ? i.activityType : 'other';
              return (
                <li key={i.id}>
                  <Link href={`/invites/${i.id}`} className="mg-program-row mg-activity-row">
                    <ActivityIcon type={type} />
                    <span className="mg-program-row__text">
                      <span className="mg-program-row__name">{i.title}</span>
                      <span className="mg-program-row__meta">
                        {when.format(new Date(i.startsAt))} · {i.place.name}
                      </span>
                      <span className="mg-program-row__meta">
                        {ta(`types.${type}`)} · {t('going', { n: i.going })}
                        {i.canceled ? ` · ${t('canceled')}` : i.mine ? ` · ${t('hosting')}` : i.myStatus ? ` · ${t(`status.${i.myStatus}`)}` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mg-body-empty">{t('empty')}</p>
        )}
      </div>
    </>
  );
}
