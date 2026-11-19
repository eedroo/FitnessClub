import { ACTIVITY_GLYPHS, ACTIVITY_GLYPH_VIEWBOX } from '@/lib/activities/glyphs';
import { activityGroup, type ActivityType } from '@/lib/activities/types';

/** Ícone próprio de cada atividade (como no app Saúde), na cor do grupo (ginásio verde, cardio laranja…). */
export function ActivityIcon({ type, size = 18 }: { type: ActivityType; size?: number }) {
  const d = ACTIVITY_GLYPHS[type] ?? ACTIVITY_GLYPHS.other;
  return (
    <span className={`mg-activity-icon mg-activity-icon--${activityGroup(type)}`} aria-hidden="true">
      <svg width={size + 4} height={size + 4} viewBox={ACTIVITY_GLYPH_VIEWBOX} fill="currentColor" focusable="false">
        <path d={d} />
      </svg>
    </span>
  );
}
