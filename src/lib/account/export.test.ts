import { describe, expect, it } from 'vitest';
import { toDbDate } from '@/lib/dates';
import { buildExport, type ExportSource } from './export';

const at = new Date('2026-10-02T10:00:00Z');

/** Registos completos, como vêm do Prisma (incluindo campos secretos que a exportação tem de ignorar). */
const source = {
  user: {
    id: 'u1', name: 'Ana', email: 'ana@example.com', passwordHash: '$2b$12$SEGREDO_HASH', sessionVersion: 3,
    locale: 'PT_PT', theme: 'DARK', timezone: 'Europe/Lisbon', emailVerifiedAt: at, termsAcceptedAt: at, termsVersion: '2026-11',
    privacyVersion: '2026-11', wellbeingConsentAt: at, createdAt: at, onboardedAt: at,
    plan: 'PREMIUM', planSource: 'MANUAL', planSince: at, planExpiresAt: null,
    authTokens: [{ tokenHash: 'SEGREDO_TOKEN_HASH' }],
  },
  activeDays: [{ userId: 'u1', day: toDbDate('2026-10-01') }, { userId: 'u1', day: toDbDate('2026-10-02') }],
  fitness: {
    prefs: { userId: 'u1', defaultRestSec: 90, restAlert: true, keepAwake: true, onboardedAt: at, weighInReminder: true, weighInTime: '07:30' },
    weights: [{ userId: 'u1', date: toDbDate('2026-10-20'), grams: 76250, createdAt: at, updatedAt: at }],
    goal: { userId: 'u1', direction: 'GAIN', weeklyRateGrams: 250, targetGrams: 78000, startGrams: 76000, startedAt: at },
    programs: [{
      id: 'p1', userId: 'u1', name: 'PPL', description: null, kind: 'STRENGTH', order: 0, archivedAt: null, createdAt: at,
      workouts: [{
        id: 'w1', programId: 'p1', userId: 'u1', name: 'Push', notes: null, order: 0, archivedAt: null,
        items: [{ id: 'i1', workoutId: 'w1', exerciseId: 'Barbell_Bench_Press', order: 0, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetSec: null, restSec: null, notes: null }],
      }],
    }],
    sessions: [{
      id: 's1', userId: 'u1', workoutId: 'w1', date: toDbDate('2026-10-01'), startedAt: at, endedAt: at, restEndsAt: null, restExerciseId: null,
      clientHidden: false, extraExercises: [], notes: null,
      sets: [{ id: 'x1', sessionId: 's1', userId: 'u1', exerciseId: 'Barbell_Bench_Press', order: 1, reps: 10, weightGrams: 62500, durationSec: null, completedAt: at, restSec: 90, prKinds: ['weight'] }],
    }],
    customExercises: [{
      id: 'custom_1', source: 'CUSTOM', ownerId: 'u1', names: { 'pt-PT': 'Remada' }, category: 'strength', measure: 'REPS_WEIGHT',
      primaryMuscles: ['lats'], secondaryMuscles: [], equipment: null, level: null, instructions: null, images: [], defaultRestSec: null, archivedAt: null,
    }],
  },
  // Não faz parte da origem, mas se alguém o passar por engano não pode aparecer.
  pushSubscriptions: [{ endpoint: 'https://push.example.com/SEGREDO', p256dh: 'SEGREDO_P256DH', auth: 'SEGREDO_AUTH' }],
} as unknown as ExportSource;

describe('buildExport', () => {
  const out = buildExport(source, at);
  const json = JSON.stringify(out);

  it('formato e todas as secções', () => {
    expect(out.format).toBe('fitnessclub-export-v1');
    for (const key of ['exportedAt', 'user', 'activeDays', 'fitness']) expect(out, key).toHaveProperty(key);
    // Treinos, sessões com séries (kg) e exercícios próprios.
    expect(out.fitness.programs[0]!.workouts[0]!.items[0]).toMatchObject({ exerciseId: 'Barbell_Bench_Press', targetSets: 3 });
    expect(out.fitness.sessions[0]).toMatchObject({ date: '2026-10-01', workoutId: 'w1' });
    expect(out.fitness.sessions[0]!.sets[0]).toMatchObject({ reps: 10, weightGrams: 62500, weightKg: 62.5 });
    expect(out.fitness.customExercises[0]).toMatchObject({ id: 'custom_1', names: { 'pt-PT': 'Remada' } });
    expect(out.fitness.prefs).toMatchObject({ defaultRestSec: 90, keepAwake: true, weighInReminder: true, weighInTime: '07:30' });
    // Peso diário, objectivo e recordes.
    expect(out.fitness.weights).toEqual([{ date: '2026-10-20', grams: 76250, kg: 76.25, updatedAt: at.toISOString() }]);
    expect(out.fitness.goal).toMatchObject({ direction: 'GAIN', weeklyRateGrams: 250, targetGrams: 78000 });
    expect(out.fitness.sessions[0]!.sets[0]!.prKinds).toEqual(['weight']);
    // Plano e dias activos.
    expect(out.user).toMatchObject({ plan: 'PREMIUM', planSince: at.toISOString(), planExpiresAt: null });
    expect(out.activeDays).toEqual(['2026-10-01', '2026-10-02']);
  });

  it('sem segredos', () => {
    for (const s of ['passwordHash', 'SEGREDO', 'p256dh', 'endpoint', 'tokenHash', 'sessionVersion']) expect(json, s).not.toContain(s);
  });
});
