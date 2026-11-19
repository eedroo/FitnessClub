import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { getMyProfile } from '@/lib/social/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { JoinCommunity } from '@/components/social/JoinCommunity';
import { ShareLevelsToggle } from '@/components/social/ShareLevelsToggle';
import { ProfileActions } from '@/components/social/ProfileActions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social.edit');
  return { title: t('title') };
}

/** O meu perfil público: @, nome, bio, mostrar níveis de força e as pessoas bloqueadas. */
export default async function EditSocialProfilePage() {
  const { userId } = await bodyPage();
  const [t, ts, profile, blocked] = await Promise.all([
    getTranslations('social.edit'),
    getTranslations('social'),
    getMyProfile(userId),
    db.block.findMany({ where: { blockerId: userId }, include: { blocked: { select: { id: true, name: true, socialProfile: { select: { handle: true, displayName: true } } } } } }),
  ]);
  if (!profile) redirect('/feed');
  return (
    <>
      <BodyHeader title={t('title')} backHref="/feed" backLabel={ts('feed')} />
      <div className="mg-body-shell__main">
        <JoinCommunity edit initial={{ handle: profile.handle, displayName: profile.displayName, bio: profile.bio ?? '' }} />
        <ShareLevelsToggle initial={profile.shareLevels} />
        <h2 className="mg-body-section-title">{t('blocked')}</h2>
        {blocked.length ? (
          <ul className="mg-program-list">
            {blocked.map((b) => (
              <li key={b.blockedId} className="mg-program-row">
                <span className="mg-program-row__text">
                  <span className="mg-program-row__name">{b.blocked.socialProfile?.displayName ?? b.blocked.name}</span>
                  {b.blocked.socialProfile && <span className="mg-program-row__meta">@{b.blocked.socialProfile.handle}</span>}
                </span>
                <ProfileActions userId={b.blockedId} rel="blocked" friendshipId={null} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mg-notes__empty">{t('noBlocked')}</p>
        )}
      </div>
    </>
  );
}
