import { Activity, Bike, Dumbbell, Flower2, Footprints, HeartPulse, Mountain, Music, Snowflake, Swords, Target, Volleyball, Waves } from 'lucide-react';
import { activityGroup, type ActivityGroup, type ActivityType } from '@/lib/activities/types';

const ICONS: Record<ActivityGroup, typeof Activity> = {
  strength: Dumbbell,
  cardio: HeartPulse,
  walkrun: Footprints,
  cycling: Bike,
  water: Waves,
  mindbody: Flower2,
  dance: Music,
  combat: Swords,
  team: Volleyball,
  racket: Target,
  winter: Snowflake,
  outdoor: Mountain,
  other: Activity,
};

/** Ícone de linha do grupo da atividade (lucide), num círculo azul. */
export function ActivityIcon({ type, size = 18 }: { type: ActivityType; size?: number }) {
  const Icon = ICONS[activityGroup(type)];
  return (
    <span className="mg-activity-icon" aria-hidden="true">
      <Icon size={size} strokeWidth={1.75} />
    </span>
  );
}
