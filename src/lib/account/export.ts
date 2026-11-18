import type { BodyGoal, BodyWeightEntry, Exercise, FitnessPrefs, FitnessProgram, FitnessSession, FitnessWorkout, SessionSet, User, UserActiveDay, WorkoutItem } from '@prisma/client';
import { fromDbDate } from '@/lib/dates';

/**
 * Exportação de dados (RGPD, portabilidade): JSON `fitnessclub-export-v1`. Puro.
 * Lista explícita de campos — segredos (hash da palavra-passe, tokens, chaves de push, sessionVersion)
 * nunca entram. Datas de calendário em `YYYY-MM-DD`; instantes em ISO 8601.
 */
export const EXPORT_FORMAT = 'fitnessclub-export-v1';

export interface ExportSource {
  user: Pick<
    User,
    | 'name' | 'email' | 'locale' | 'theme' | 'timezone' | 'emailVerifiedAt' | 'termsAcceptedAt' | 'termsVersion' | 'privacyVersion'
    | 'wellbeingConsentAt' | 'createdAt' | 'onboardedAt' | 'plan' | 'planSince' | 'planExpiresAt'
  >;
  /** Dias em que a pessoa abriu o app. */
  activeDays: UserActiveDay[];
  /** Preferências, programas, treinos, sessões com séries, exercícios próprios, peso diário e meta. */
  fitness: {
    prefs: FitnessPrefs | null;
    programs: (FitnessProgram & { workouts: (FitnessWorkout & { items: WorkoutItem[] })[] })[];
    sessions: (FitnessSession & { sets: SessionSet[] })[];
    customExercises: Exercise[];
    weights: BodyWeightEntry[];
    goal: BodyGoal | null;
  };
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const day = (d: Date) => fromDbDate(d);

export function buildExport(data: ExportSource, now: Date = new Date()) {
  const u = data.user;
  return {
    exportedAt: now.toISOString(),
    format: EXPORT_FORMAT,
    user: {
      name: u.name,
      email: u.email,
      locale: u.locale,
      theme: u.theme,
      timezone: u.timezone,
      emailVerifiedAt: iso(u.emailVerifiedAt),
      termsAcceptedAt: iso(u.termsAcceptedAt),
      termsVersion: u.termsVersion,
      privacyVersion: u.privacyVersion,
      wellbeingConsentAt: iso(u.wellbeingConsentAt),
      onboardedAt: iso(u.onboardedAt),
      createdAt: iso(u.createdAt),
      plan: u.plan,
      planSince: iso(u.planSince),
      planExpiresAt: iso(u.planExpiresAt),
    },
    activeDays: data.activeDays.map((a) => day(a.day)),
    fitness: {
      prefs: data.fitness.prefs && {
        defaultRestSec: data.fitness.prefs.defaultRestSec,
        restAlert: data.fitness.prefs.restAlert,
        keepAwake: data.fitness.prefs.keepAwake,
        weighInReminder: data.fitness.prefs.weighInReminder,
        weighInTime: data.fitness.prefs.weighInTime,
        onboardedAt: iso(data.fitness.prefs.onboardedAt),
      },
      customExercises: data.fitness.customExercises.map((e) => ({
        id: e.id,
        names: e.names,
        category: e.category,
        measure: e.measure,
        primaryMuscles: e.primaryMuscles,
        secondaryMuscles: e.secondaryMuscles,
        equipment: e.equipment,
        defaultRestSec: e.defaultRestSec,
        archivedAt: iso(e.archivedAt),
      })),
      programs: data.fitness.programs.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        kind: p.kind,
        order: p.order,
        createdAt: iso(p.createdAt),
        archivedAt: iso(p.archivedAt),
        workouts: p.workouts.map((w) => ({
          id: w.id,
          name: w.name,
          notes: w.notes,
          order: w.order,
          archivedAt: iso(w.archivedAt),
          items: w.items.map((i) => ({
            exerciseId: i.exerciseId,
            order: i.order,
            targetSets: i.targetSets,
            targetRepsMin: i.targetRepsMin,
            targetRepsMax: i.targetRepsMax,
            targetSec: i.targetSec,
            restSec: i.restSec,
            notes: i.notes,
          })),
        })),
      })),
      weights: data.fitness.weights.map((w) => ({
        date: day(w.date),
        grams: w.grams,
        kg: Math.round(w.grams / 10) / 100,
        updatedAt: iso(w.updatedAt),
      })),
      goal: data.fitness.goal && {
        direction: data.fitness.goal.direction,
        weeklyRateGrams: data.fitness.goal.weeklyRateGrams,
        targetGrams: data.fitness.goal.targetGrams,
        startGrams: data.fitness.goal.startGrams,
        startedAt: iso(data.fitness.goal.startedAt),
      },
      sessions: data.fitness.sessions.map((x) => ({
        id: x.id,
        workoutId: x.workoutId,
        date: day(x.date),
        startedAt: iso(x.startedAt),
        endedAt: iso(x.endedAt),
        notes: x.notes,
        sets: x.sets.map((t) => ({
          exerciseId: t.exerciseId,
          order: t.order,
          reps: t.reps,
          weightGrams: t.weightGrams,
          weightKg: t.weightGrams === null ? null : Math.round(t.weightGrams / 10) / 100,
          durationSec: t.durationSec,
          restSec: t.restSec,
          completedAt: iso(t.completedAt),
          prKinds: t.prKinds,
        })),
      })),
    },  };
}
