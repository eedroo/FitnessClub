import { useTranslations } from 'next-intl';
import type { WorkoutSnapshot } from '@/lib/social/rules';
import { isActivityType } from '@/lib/activities/types';
import { formatClock } from '@/lib/fitness/session';
import { ActivityIcon } from '@/components/activities/ActivityIcon';
import { MagicIcon } from '@/components/ui/MagicIcon';
import Image from 'next/image';
import { achievementArt } from '@/lib/gamification/art';
import { formatDayMonth, type DateISO } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';

/**
 * O que se partilhou num post, em compacto: sessão (séries, volume, recordes, exercícios), atividade (tipo, tempo,
 * distância), o dia de treino, ou uma conquista (emblema, nível, medalha de força, vitória no ranking) com a arte.
 */
export function WorkoutAttachment({ workout, locale }: { workout: WorkoutSnapshot; locale: string }) {
  const t = useTranslations('social.workout');
  const ta = useTranslations('activities');
  const tg = useTranslations('game');
  const tr = useTranslations('ranking');
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  if (workout.kind === 'badge' || workout.kind === 'level' || workout.kind === 'tier' || workout.kind === 'league') {
    const art =
      workout.kind === 'badge'
        ? achievementArt({ kind: 'badge', id: workout.id })
        : workout.kind === 'level'
          ? achievementArt({ kind: 'level', level: workout.level })
          : achievementArt({ kind: workout.kind, tier: workout.kind === 'tier' ? workout.tier : workout.league });
    const [title, meta] =
      workout.kind === 'badge'
        ? [tg.has(`badges.${workout.id}.name`) ? tg(`badges.${workout.id}.name`) : workout.id, t('badge')]
        : workout.kind === 'level'
          ? [tg('level', { n: workout.level }), t('level')]
          : workout.kind === 'tier'
            ? [tg.has(`tiers.${workout.tier}`) ? tg(`tiers.${workout.tier}`) : workout.tier, t('tier', { exercise: workout.exercise })]
            : [t('leagueRank', { rank: workout.rank }), tr('league', { name: tr.has(`leagues.${workout.league}`) ? tr(`leagues.${workout.league}`) : workout.league })];
    return (
      <div className="mg-post-workout mg-post-workout--achievement">
        <Image src={art} alt="" width={48} height={48} />
        <span className="mg-post-workout__text">
          <span className="mg-post-workout__name">{title}</span>
          <span className="mg-post-workout__stats">{meta}</span>
        </span>
      </div>
    );
  }
  if (workout.kind === 'day') {
    return (
      <div className="mg-post-workout">
        <span className="mg-activity-icon mg-activity-icon--strength" aria-hidden="true">
          <MagicIcon name="calendar" size="sm" decorative />
        </span>
        <span className="mg-post-workout__text">
          <span className="mg-post-workout__name">{t('dayTitle', { date: formatDayMonth(workout.date as DateISO, isAppLocale(locale) ? locale : 'pt-PT') })}</span>
          <span className="mg-post-workout__stats">
            {t('minutes', { n: workout.minutes })}
            {workout.sets > 0 && ` · ${t('sets', { n: workout.sets })} · ${num.format(workout.volumeKg)} kg`}
            {workout.prs > 0 && ` · ${t('prs', { n: workout.prs })}`}
          </span>
          {workout.names.length > 0 && <span className="mg-post-workout__list">{workout.names.join(' · ')}</span>}
        </span>
      </div>
    );
  }
  if (workout.kind === 'activity') {
    const type = isActivityType(workout.type) ? workout.type : 'other';
    return (
      <div className="mg-post-workout">
        <ActivityIcon type={type} size={22} />
        <span className="mg-post-workout__text">
          <span className="mg-post-workout__name">{ta(`types.${type}`)}</span>
          <span className="mg-post-workout__stats">
            {formatClock(workout.durationSec)}
            {workout.distanceMeters != null && ` · ${ta('km', { km: num.format(workout.distanceMeters / 1000) })}`}
          </span>
        </span>
      </div>
    );
  }
  return (
    <div className="mg-post-workout">
      <span className="mg-activity-icon mg-activity-icon--strength" aria-hidden="true">
        <MagicIcon name="dumbbell" size="sm" decorative />
      </span>
      <span className="mg-post-workout__text">
        <span className="mg-post-workout__name">{workout.name ?? t('free')}</span>
        <span className="mg-post-workout__stats">
          {formatClock(workout.durationSec)} · {t('sets', { n: workout.sets })} · {num.format(workout.volumeKg)} kg
          {workout.prs > 0 && ` · ${t('prs', { n: workout.prs })}`}
        </span>
        {workout.exercises.length > 0 && <span className="mg-post-workout__list">{workout.exercises.join(' · ')}</span>}
      </span>
    </div>
  );
}
