import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { normalizeHandle, relationship } from '@/lib/social/rules';
import { getPostsBy, getProfileByHandle } from '@/lib/social/server';
import { getGamification, getStrengthLevels } from '@/lib/gamification/server';
import { badgeArt, levelFrame } from '@/lib/gamification/art';
import { db } from '@/lib/db';
import { exerciseName, type ExerciseNames } from '@/lib/fitness/library';
import { BodyHeader } from '@/components/body/BodyHeader';
import { Avatar } from '@/components/social/Avatar';
import { PostCard } from '@/components/social/PostCard';
import { ProfileActions } from '@/components/social/ProfileActions';
import { StrengthTier } from '@/components/gamification/StrengthTier';

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  return { title: `@${normalizeHandle(decodeURIComponent(params.handle))}` };
}

/** Perfil público: nome, @, bio, nível e emblemas (externos), níveis de força (se a pessoa quiser), amizade e posts. */
export default async function ProfilePage({ params }: { params: { handle: string } }) {
  const { userId, locale } = await bodyPage();
  const handle = normalizeHandle(decodeURIComponent(params.handle));
  const [t, tg, data] = await Promise.all([getTranslations('social'), getTranslations('game'), getProfileByHandle(userId, handle)]);
  if (!data) notFound();
  const { profile } = data;
  const rel = relationship(userId, profile.userId, data.rows, data.iBlocked);
  const incoming = data.rows.find((r) => r.requesterId === profile.userId && r.status === 'PENDING');
  const [game, posts, strength] = await Promise.all([
    getGamification(profile.userId),
    rel === 'blocked' ? Promise.resolve([]) : getPostsBy(userId, profile.userId),
    profile.shareLevels && rel !== 'blocked' ? getStrengthLevels(profile.userId) : Promise.resolve(null),
  ]);
  const earned = game.badges.filter((b) => b.earnedOn);
  const names = strength?.levels.length
    ? new Map((await db.exercise.findMany({ where: { id: { in: strength.levels.map((l) => l.exerciseId) } }, select: { id: true, names: true } })).map((e) => [e.id, exerciseName(e.names as ExerciseNames, locale)]))
    : new Map<string, string>();
  return (
    <>
      <BodyHeader title={profile.displayName} backHref="/feed" backLabel={t('feed')} historyBack />
      <div className="mg-body-shell__main">
        <section className="mg-profile-head">
          <Avatar name={profile.displayName} size={72} />
          <div className="mg-profile-head__text">
            <p className="mg-profile-head__handle">@{profile.handle}</p>
            {profile.bio && <p className="mg-profile-head__bio">{profile.bio}</p>}
            <p className="mg-profile-head__meta">{t('friendsCount', { n: data.friendsCount })}</p>
          </div>
          <span className="mg-level__seal" title={tg('level', { n: game.summary.level })}>
            <Image className="mg-level__frame" src={levelFrame(game.summary.level)} alt="" width={60} height={60} />
            <span className="mg-level__num">{game.summary.level}</span>
          </span>
        </section>
        <ProfileActions userId={profile.userId} rel={rel} friendshipId={incoming?.id ?? null} />
        {rel === 'self' && (
          <Link href="/feed/profile" className="mg-btn mg-btn--subtle mg-btn--block">
            {t('edit.title')}
          </Link>
        )}
        {earned.length > 0 && rel !== 'blocked' && (
          <ul className="mg-profile-badges" aria-label={tg('badgesTitle')}>
            {earned.map((b) => (
              <li key={b.id} title={tg(`badges.${b.id}.name`)}>
                <Image src={badgeArt(b.id)} alt={tg(`badges.${b.id}.name`)} width={48} height={48} />
              </li>
            ))}
          </ul>
        )}
        {strength && strength.levels.some((l) => l.tier) && (
          <>
            <h2 className="mg-body-section-title">{tg('strength.title')}</h2>
            <ul className="mg-program-list">
              {strength.levels
                .filter((l) => l.tier)
                .map((l) => (
                  <li key={l.exerciseId} className="mg-program-row">
                    <span className="mg-program-row__name">{names.get(l.exerciseId) ?? l.exerciseId}</span>
                    <StrengthTier tier={l.tier} />
                  </li>
                ))}
            </ul>
          </>
        )}
        <h2 className="mg-body-section-title">{t('posts')}</h2>
        {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} locale={locale} />) : <p className="mg-notes__empty">{rel === 'none' || rel === 'outgoing' ? t('onlyPublic') : t('noPosts')}</p>}
      </div>
    </>
  );
}
