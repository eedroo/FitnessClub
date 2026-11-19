import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { exerciseName, type ExerciseNames } from '@/lib/fitness/library';
import { formatDayMonth } from '@/lib/dates';
import { getGamification, getStrengthLevels } from '@/lib/gamification/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { LevelCard } from '@/components/gamification/LevelCard';
import { BadgeGrid } from '@/components/gamification/BadgeGrid';
import { StrengthTier } from '@/components/gamification/StrengthTier';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('game');
  return { title: t('title') };
}

/** Conquistas: nível e de onde veio o XP, emblemas e níveis de força por exercício (estes só a pessoa vê). */
export default async function AchievementsPage() {
  const { userId, locale } = await bodyPage();
  const [t, tf, game, strength] = await Promise.all([
    getTranslations('game'),
    getTranslations('fitness'),
    getGamification(userId),
    getStrengthLevels(userId),
  ]);
  const exercises = await db.exercise.findMany({ where: { id: { in: strength.levels.map((l) => l.exerciseId) } }, select: { id: true, names: true } });
  const names = new Map(exercises.map((e) => [e.id, exerciseName(e.names as ExerciseNames, locale)]));
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const value = (by: 'ratio' | 'reps', v: number) => (by === 'ratio' ? t('strength.ratio', { v: num.format(v) }) : t('strength.reps', { n: v }));
  const order = ['diamond', 'platinum', 'gold', 'silver', 'bronze'];
  const levels = [...strength.levels].sort((a, b) => (a.tier ? order.indexOf(a.tier) : 9) - (b.tier ? order.indexOf(b.tier) : 9) || b.progress - a.progress);
  const { summary } = game;
  const parts = [
    { key: 'sessions', n: summary.sessions, xp: summary.breakdown.sessions },
    { key: 'sets', n: summary.sets, xp: summary.breakdown.sets },
    { key: 'prs', n: summary.prs, xp: summary.breakdown.prs },
    { key: 'activities', n: summary.activities, xp: summary.breakdown.activities },
    { key: 'weeks', n: summary.weeks.weeks.length, xp: summary.breakdown.weeks },
  ] as const;

  return (
    <>
      <BodyHeader title={t('title')} backHref="/" backLabel={tf('nav.workouts')} />
      <div className="mg-body-shell__main">
        <LevelCard summary={summary} />
        <ul className="mg-program-list">
          {parts.map((p) => (
            <li key={p.key} className="mg-program-row">
              <span className="mg-program-row__text">
                <span className="mg-program-row__name">{t(`from.${p.key}`, { n: p.n })}</span>
              </span>
              <span className="mg-game__xp">{t('xp', { n: p.xp })}</span>
            </li>
          ))}
        </ul>
        <p className="mg-day-metrics__note">{t('fair')}</p>

        <h2 className="mg-body-section-title">{t('badgesTitle')}</h2>
        <BadgeGrid badges={game.badges} formatDate={(d) => formatDayMonth(d, locale)} />

        <h2 className="mg-body-section-title">{t('strength.title')}</h2>
        <p className="mg-day-metrics__note">{t('strength.private')}</p>
        {strength.needsWeight && (
          <p className="mg-day-metrics__note">
            <Link href="/weight">{t('strength.needsWeight')}</Link>
          </p>
        )}
        {levels.length ? (
          <ul className="mg-program-list">
            {levels.map((l) => (
              <li key={l.exerciseId}>
                <Link href={`/exercises/${encodeURIComponent(l.exerciseId)}`} className="mg-program-row mg-game__strength">
                  <span className="mg-program-row__text">
                    <span className="mg-program-row__name">{names.get(l.exerciseId) ?? l.exerciseId}</span>
                    <span className="mg-program-row__meta">
                      {value(l.by, l.value)}
                      {l.next != null && ` · ${t('strength.next', { v: value(l.by, l.next) })}`}
                    </span>
                    <span className="mg-badges__bar" aria-hidden="true">
                      <span className={`mg-badges__fill mg-game__fill--${l.tier ?? 'none'}`} style={{ width: `${Math.round(l.progress * 100)}%` }} />
                    </span>
                  </span>
                  {l.tier ? <StrengthTier tier={l.tier} /> : <span className="mg-program-row__meta">{t('strength.belowBronze')}</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mg-notes__empty">{t('strength.empty')}</p>
        )}
      </div>
    </>
  );
}
