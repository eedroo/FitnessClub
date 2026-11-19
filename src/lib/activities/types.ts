import { z } from 'zod';

/**
 * Tipos de atividade, como no app Saúde/Fitness do iPhone (HKWorkoutActivityType), agrupados para escolher.
 * Os nomes vivem em `messages` (`activities.types.<key>`); os grupos em `activities.groups.<group>`. Puro.
 */
export const ACTIVITY_GROUPS = ['strength', 'cardio', 'walkrun', 'cycling', 'water', 'mindbody', 'dance', 'combat', 'team', 'racket', 'winter', 'outdoor', 'other'] as const;
export type ActivityGroup = (typeof ACTIVITY_GROUPS)[number];

interface ActivityDef {
  group: ActivityGroup;
  /** Pede distância (km). */
  distance?: boolean;
}

export const ACTIVITY_TYPES = {
  // Força e ginásio
  traditional_strength: { group: 'strength' },
  functional_strength: { group: 'strength' },
  core_training: { group: 'strength' },
  cross_training: { group: 'strength' },
  gymnastics: { group: 'strength' },
  // Cardio
  hiit: { group: 'cardio' },
  mixed_cardio: { group: 'cardio' },
  elliptical: { group: 'cardio', distance: true },
  rowing: { group: 'cardio', distance: true },
  stair_climbing: { group: 'cardio' },
  stairs: { group: 'cardio' },
  step_training: { group: 'cardio' },
  jump_rope: { group: 'cardio' },
  fitness_gaming: { group: 'cardio' },
  // Caminhada e corrida
  walking: { group: 'walkrun', distance: true },
  running: { group: 'walkrun', distance: true },
  hiking: { group: 'walkrun', distance: true },
  track_and_field: { group: 'walkrun' },
  wheelchair_walk: { group: 'walkrun', distance: true },
  wheelchair_run: { group: 'walkrun', distance: true },
  // Ciclismo
  cycling: { group: 'cycling', distance: true },
  indoor_cycling: { group: 'cycling', distance: true },
  hand_cycling: { group: 'cycling', distance: true },
  // Água
  pool_swim: { group: 'water', distance: true },
  open_water_swim: { group: 'water', distance: true },
  water_fitness: { group: 'water' },
  water_polo: { group: 'water' },
  surfing: { group: 'water' },
  paddle_sports: { group: 'water', distance: true },
  sailing: { group: 'water', distance: true },
  water_sports: { group: 'water' },
  // Corpo e mente
  yoga: { group: 'mindbody' },
  pilates: { group: 'mindbody' },
  barre: { group: 'mindbody' },
  tai_chi: { group: 'mindbody' },
  mind_and_body: { group: 'mindbody' },
  flexibility: { group: 'mindbody' },
  cooldown: { group: 'mindbody' },
  preparation_recovery: { group: 'mindbody' },
  // Dança
  cardio_dance: { group: 'dance' },
  social_dance: { group: 'dance' },
  // Lutas
  boxing: { group: 'combat' },
  kickboxing: { group: 'combat' },
  martial_arts: { group: 'combat' },
  wrestling: { group: 'combat' },
  fencing: { group: 'combat' },
  // Desportos de equipa
  soccer: { group: 'team' },
  basketball: { group: 'team' },
  volleyball: { group: 'team' },
  handball: { group: 'team' },
  american_football: { group: 'team' },
  australian_football: { group: 'team' },
  rugby: { group: 'team' },
  baseball: { group: 'team' },
  softball: { group: 'team' },
  cricket: { group: 'team' },
  hockey: { group: 'team' },
  lacrosse: { group: 'team' },
  // Raquetes
  tennis: { group: 'racket' },
  table_tennis: { group: 'racket' },
  badminton: { group: 'racket' },
  squash: { group: 'racket' },
  racquetball: { group: 'racket' },
  pickleball: { group: 'racket' },
  padel: { group: 'racket' },
  // Neve e gelo
  downhill_skiing: { group: 'winter', distance: true },
  cross_country_skiing: { group: 'winter', distance: true },
  snowboarding: { group: 'winter' },
  skating: { group: 'winter', distance: true },
  curling: { group: 'winter' },
  snow_sports: { group: 'winter' },
  // Ar livre
  climbing: { group: 'outdoor' },
  equestrian_sports: { group: 'outdoor' },
  golf: { group: 'outdoor' },
  archery: { group: 'outdoor' },
  fishing: { group: 'outdoor' },
  hunting: { group: 'outdoor' },
  disc_sports: { group: 'outdoor' },
  skateboarding: { group: 'outdoor' },
  // Outros
  bowling: { group: 'other' },
  play: { group: 'other' },
  other: { group: 'other' },
} satisfies Record<string, ActivityDef>;

export type ActivityType = keyof typeof ACTIVITY_TYPES;
export const ACTIVITY_KEYS = Object.keys(ACTIVITY_TYPES) as ActivityType[];
export const isActivityType = (k: string): k is ActivityType => k in ACTIVITY_TYPES;
export const activityGroup = (k: ActivityType): ActivityGroup => ACTIVITY_TYPES[k].group;
export const hasDistance = (k: ActivityType): boolean => 'distance' in ACTIVITY_TYPES[k] && ACTIVITY_TYPES[k].distance === true;

/** Esforço 1–10 em 4 faixas (como no app Fitness): leve, moderado, difícil, máximo. */
export function effortBand(effort: number): 'easy' | 'moderate' | 'hard' | 'allOut' {
  if (effort <= 3) return 'easy';
  if (effort <= 6) return 'moderate';
  if (effort <= 8) return 'hard';
  return 'allOut';
}

export const activitySchema = z
  .object({
    type: z.string().refine(isActivityType),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMin: z.number().int().min(1).max(24 * 60),
    effort: z.number().int().min(1).max(10).nullable(),
    distanceKm: z.number().min(0).max(1000).nullable(),
    notes: z.string().trim().max(1000).nullable(),
  })
  .transform((v) => ({ ...v, distanceKm: isActivityType(v.type) && hasDistance(v.type) ? v.distanceKm : null, notes: v.notes || null }));

export type ActivityInput = z.input<typeof activitySchema>;
