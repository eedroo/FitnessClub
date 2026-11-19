import { useTranslations } from 'next-intl';
import type { WorkoutSnapshot } from '@/lib/social/rules';
import { isActivityType } from '@/lib/activities/types';
import { formatClock } from '@/lib/fitness/session';
import { ActivityIcon } from '@/components/activities/ActivityIcon';
import { MagicIcon } from '@/components/ui/MagicIcon';

/** O treino partilhado num post: sessão (séries, volume, recordes, exercícios) ou atividade (tipo, tempo, distância). */
export function WorkoutAttachment({ workout, locale }: { workout: WorkoutSnapshot; locale: string }) {
  const t = useTranslations('social.workout');
  const ta = useTranslations('activities');
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
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
      <span className="mg-activity-icon" aria-hidden="true">
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
