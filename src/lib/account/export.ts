import type { Activity, AiRequest, TrainingProfile, BodyGoal, BodyWeightEntry, Exercise, ExerciseNote, FitnessPrefs, FitnessProgram, FitnessSession, FitnessWorkout, SessionSet, User, UserActiveDay, WorkoutItem } from '@prisma/client';
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
  > & Partial<Pick<User, 'aiConsentAt'>>;
  /** Comunidade: perfil público, amizades, publicações, gostos e comentários (meus). */
  social?: {
    profile: { handle: string; displayName: string; bio: string | null; shareLevels: boolean; createdAt: Date } | null;
    friends: { handle: string | null; since: Date | null }[];
    posts: { text: string | null; visibility: string; workout: unknown; createdAt: Date }[];
    comments: { postId: string; text: string; createdAt: Date }[];
    likes: { postId: string; createdAt: Date }[];
    groups?: { name: string; owner: boolean; goal: string; joinedAt: Date }[];
  };
  /** Outras atividades registadas (corrida, yoga…). */
  activities?: Activity[];
  /** Pedidos à IA (programas propostos e retrospectivas), sem custos internos. */
  ai?: AiRequest[];
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
    /** Notas pessoais dos exercícios. */
    exerciseNotes?: ExerciseNote[];
    /** Perfil de treino (objectivos, nível, equipamento, músculos em foco, dias, pedidos). */
    profile?: TrainingProfile | null;
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
      aiConsentAt: iso(u.aiConsentAt),
      onboardedAt: iso(u.onboardedAt),
      createdAt: iso(u.createdAt),
      plan: u.plan,
      planSince: iso(u.planSince),
      planExpiresAt: iso(u.planExpiresAt),
    },
    activeDays: data.activeDays.map((a) => day(a.day)),
    social: data.social
      ? {
          profile: data.social.profile && { ...data.social.profile, createdAt: iso(data.social.profile.createdAt) },
          friends: data.social.friends.map((f) => ({ handle: f.handle, since: iso(f.since) })),
          posts: data.social.posts.map((p) => ({ ...p, createdAt: iso(p.createdAt) })),
          comments: data.social.comments.map((c) => ({ ...c, createdAt: iso(c.createdAt) })),
          likes: data.social.likes.map((l) => ({ ...l, createdAt: iso(l.createdAt) })),
          groups: (data.social.groups ?? []).map((g) => ({ ...g, joinedAt: iso(g.joinedAt) })),
        }
      : null,
    activities: (data.activities ?? []).map((a) => ({
      type: a.type,
      date: day(a.date),
      startedAt: iso(a.startedAt),
      durationSec: a.durationSec,
      effort: a.effort,
      distanceMeters: a.distanceMeters,
      notes: a.notes,
    })),
    ai: (data.ai ?? []).map((r) => ({
      kind: r.kind,
      status: r.status,
      weekStart: r.weekStart ? day(r.weekStart) : null,
      facts: r.facts,
      result: r.result,
      createdAt: iso(r.createdAt),
    })),
    fitness: {
      prefs: data.fitness.prefs && {
        defaultRestSec: data.fitness.prefs.defaultRestSec,
        restAlert: data.fitness.prefs.restAlert,
        keepAwake: data.fitness.prefs.keepAwake,
        weighInReminder: data.fitness.prefs.weighInReminder,
        weighInTime: data.fitness.prefs.weighInTime,
        onboardedAt: iso(data.fitness.prefs.onboardedAt),
        aiWeeklyInsights: data.fitness.prefs.aiWeeklyInsights,
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
        notes: p.notes,
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
      profile: data.fitness.profile
        ? {
            goals: data.fitness.profile.goals,
            level: data.fitness.profile.level,
            equipment: data.fitness.profile.equipment,
            focusMuscles: data.fitness.profile.focusMuscles,
            trainingDays: data.fitness.profile.trainingDays,
            sessionMinutes: data.fitness.profile.sessionMinutes,
            wishes: data.fitness.profile.wishes,
            avoid: data.fitness.profile.avoid,
            updatedAt: iso(data.fitness.profile.updatedAt),
          }
        : null,
      exerciseNotes: (data.fitness.exerciseNotes ?? []).map((n) => ({ exerciseId: n.exerciseId, text: n.text, byAi: n.byAi, updatedAt: iso(n.updatedAt) })),
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
