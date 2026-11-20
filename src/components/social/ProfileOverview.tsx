import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import type { AppLocale } from '@/i18n/locales';
import { exerciseName, type ExerciseNames } from '@/lib/fitness/library';
import { getPostsBy } from '@/lib/social/server';
import type { Relationship } from '@/lib/social/rules';
import { getGamification, getStrengthLevels } from '@/lib/gamification/server';
import { levelArtHasNumber, levelFrame } from '@/lib/gamification/art';
import { formatDayMonth } from '@/lib/dates';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';
import { ProfileActions } from './ProfileActions';
import { StrengthTier } from '@/components/gamification/StrengthTier';
import { BadgeGrid } from '@/components/gamification/BadgeGrid';

/**
 * Um perfil (o meu no "Eu" ou o de outra pessoa): avatar, @, bio, nível, amigos, emblemas, níveis de força (os meus
 * sempre; os dos outros só se o mostrarem), acções de amizade e publicações.
 */
export async function ProfileOverview({
  viewerId,
  profile,
  rel,
  friendshipId,
  friendsCount,
  locale,
  children,
}: {
  viewerId: string;
  profile: { userId: string; handle: string; displayName: string; bio: string | null; shareLevels: boolean; avatarUrl?: string | null };
  rel: Relationship;
  friendshipId: string | null;
  friendsCount: number;
  locale: AppLocale;
  /** Conteúdo entre o perfil e as publicações (no "Eu": o corpo). */
  children?: React.ReactNode;
}) {
  const [t, tg] = await Promise.all([getTranslations('social'), getTranslations('game')]);
  const self = rel === 'self';
  const [game, posts, strength] = await Promise.all([
    getGamification(profile.userId),
    rel === 'blocked' ? Promise.resolve([]) : getPostsBy(viewerId, profile.userId),
    (self || profile.shareLevels) && rel !== 'blocked' ? getStrengthLevels(profile.userId) : Promise.resolve(null),
  ]);
  const earned = game.badges.filter((b) => b.earnedOn);
  const tiers = strength?.levels.filter((l) => l.tier) ?? [];
  const names = tiers.length
    ? new Map((await db.exercise.findMany({ where: { id: { in: tiers.map((l) => l.exerciseId) } }, select: { id: true, names: true } })).map((e) => [e.id, exerciseName(e.names as ExerciseNames, locale)]))
    : new Map<string, string>();
  return (
    <>
      <section className="mg-profile-head">
        <Avatar name={profile.displayName} url={profile.avatarUrl ?? null} size={72} />
        <div className="mg-profile-head__text">
          <p className="mg-profile-head__name">{profile.displayName}</p>
          <p className="mg-profile-head__handle">@{profile.handle}</p>
          {profile.bio && <p className="mg-profile-head__bio">{profile.bio}</p>}
          <Link href={self ? '/friends' : `/u/${profile.handle}`} className="mg-profile-head__meta">
            {t('friendsCount', { n: friendsCount })}
          </Link>
        </div>
        <Link href={self ? '/achievements' : `/u/${profile.handle}`} className="mg-level__seal" aria-label={tg('level', { n: game.summary.level })}>
          <Image className="mg-level__frame" src={levelFrame(game.summary.level)} alt="" width={60} height={60} />
          {!levelArtHasNumber(game.summary.level) && <span className="mg-level__num">{game.summary.level}</span>}
        </Link>
      </section>
      {/* Barra de XP até ao próximo nível (como no cabeçalho de Treinos). */}
      {rel !== 'blocked' && (
        <Link href={self ? '/achievements' : `/u/${profile.handle}`} className="mg-profile-xp">
          <span className="mg-level__bar" role="progressbar" aria-valuemin={0} aria-valuemax={game.summary.span} aria-valuenow={game.summary.into} aria-label={tg('toNext')}>
            <span className="mg-level__fill" style={{ width: `${Math.round((game.summary.into / game.summary.span) * 100)}%` }} />
          </span>
          <span className="mg-level__meta">
            {tg('level', { n: game.summary.level })} · {tg('xpToNext', { into: game.summary.into, span: game.summary.span, next: game.summary.level + 1 })}
            {game.summary.weeks.current > 0 && ` · ${tg('streak', { n: game.summary.weeks.current })}`}
          </span>
        </Link>
      )}
      {self ? (
        <Link href="/feed/profile" className="mg-btn mg-btn--subtle mg-btn--block">
          {t('editProfile')}
        </Link>
      ) : (
        <ProfileActions userId={profile.userId} rel={rel} friendshipId={friendshipId} />
      )}
      {/* No "Eu": o corpo (peso e mapa muscular) vem antes dos emblemas e das conquistas. */}
      {children}
      {rel !== 'blocked' && (self || earned.length > 0) && (
        <>
          <h2 className="mg-body-section-title">{tg('badgesTitle')}</h2>
          <BadgeGrid badges={self ? game.badges : earned} formatDate={(d) => formatDayMonth(d, locale)} />
        </>
      )}
      {tiers.length > 0 && (
        <>
          <h2 className="mg-body-section-title">{tg('strength.title')}</h2>
          <ul className="mg-program-list">
            {tiers.map((l) => (
              <li key={l.exerciseId}>
                <Link href={self ? `/exercises/${encodeURIComponent(l.exerciseId)}` : `/u/${profile.handle}`} className="mg-program-row">
                  <span className="mg-program-row__name">{names.get(l.exerciseId) ?? l.exerciseId}</span>
                  <StrengthTier tier={l.tier} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {self && (
        <Link href="/achievements" className="mg-btn mg-btn--subtle mg-btn--block">
          {t('allAchievements')}
        </Link>
      )}
      <h2 className="mg-body-section-title">{t('posts')}</h2>
      {posts.length ? (
        posts.map((p) => <PostCard key={p.id} post={p} locale={locale} />)
      ) : (
        <p className="mg-notes__empty">{self ? t('noPostsMine') : rel === 'none' || rel === 'outgoing' ? t('onlyPublic') : t('noPosts')}</p>
      )}
    </>
  );
}
