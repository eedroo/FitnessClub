import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { getNotices } from '@/lib/social/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { Avatar } from '@/components/social/Avatar';
import { MarkNoticesRead } from '@/components/social/MarkNoticesRead';
import { relTime } from '@/components/social/PostCard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social.notices');
  return { title: t('title') };
}

/** Avisos da comunidade: pedidos de amizade, amizades aceites, gostos e comentários. */
export default async function NoticesPage() {
  const { userId, locale } = await bodyPage();
  const [t, ts, notices] = await Promise.all([getTranslations('social.notices'), getTranslations('social'), getNotices(userId)]);
  return (
    <>
      <BodyHeader title={t('title')} backHref="/feed" backLabel={ts('feed')} />
      <div className="mg-body-shell__main">
        <MarkNoticesRead />
        {notices.length ? (
          <ul className="mg-program-list">
            {notices.map((n) => (
              <li key={n.id}>
                <Link href={n.inviteId ? `/invites/${n.inviteId}` : n.postId ? `/p/${n.postId}` : n.kind === 'FRIEND_REQUEST' ? '/friends' : `/u/${n.actor.handle}`} className="mg-program-row mg-notice">
                  {!n.read && <span className="mg-ai-dot" aria-label={t('new')} />}
                  <Avatar name={n.actor.displayName} url={n.actor.avatarUrl} size={36} />
                  <span className="mg-program-row__text">
                    <span className="mg-program-row__name">{t(`kinds.${n.kind}`, { name: n.actor.displayName })}</span>
                    <span className="mg-program-row__meta">{relTime(n.createdAt, locale)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mg-body-empty">{t('empty')}</p>
        )}
      </div>
    </>
  );
}
