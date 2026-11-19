import { describe, expect, it } from 'vitest';
import { checkAiProgram, fakeProgram, pickCandidates, programPrompt, type CandidateExercise } from './program';
import { EMPTY_PROFILE } from '@/lib/fitness/profile';

const ex = (id: string, o: Partial<CandidateExercise> = {}): CandidateExercise => ({
  id,
  name: id.replace(/_/g, ' '),
  category: 'strength',
  equipment: 'barbell',
  level: 'beginner',
  primaryMuscles: ['chest'],
  measure: 'REPS_WEIGHT',
  hasImages: true,
  ...o,
});

const lib = [
  ex('Barbell_Bench_Press'),
  ex('Dumbbell_Curl', { equipment: 'dumbbell' }),
  ex('Pushups', { equipment: 'body only', measure: 'REPS' }),
  ex('Plank', { equipment: 'body only', measure: 'DURATION' }),
  ex('Leg_Press', { equipment: 'machine' }),
  ex('Atlas_Stones', { category: 'strongman', equipment: 'other' }),
  ex('Snatch', { category: 'olympic weightlifting', level: 'expert' }),
];

describe('pickCandidates', () => {
  it('filtra pelo equipamento do perfil', () => {
    const ids = pickCandidates(lib, { ...EMPTY_PROFILE, equipment: ['bodyweight'] }).map((c) => c.id);
    expect(ids.sort()).toEqual(['Plank', 'Pushups']);
  });
  it('sem equipamento indicado = ginásio completo, mas sem strongman nem olímpico para iniciantes', () => {
    const ids = pickCandidates(lib, { ...EMPTY_PROFILE, equipment: [] }).map((c) => c.id);
    expect(ids).toContain('Leg_Press');
    expect(ids).not.toContain('Atlas_Stones');
    expect(ids).not.toContain('Snatch');
  });
  it('preferidos (dos modelos) vêm primeiro', () => {
    const ids = pickCandidates(lib, { ...EMPTY_PROFILE, equipment: ['full_gym'] }, new Set(['Leg_Press'])).map((c) => c.id);
    expect(ids[0]).toBe('Leg_Press');
  });
});

describe('checkAiProgram', () => {
  const base = (items: unknown[]) => ({ name: 'P', kind: 'STRENGTH', workouts: [{ name: 'A', items }] });

  it('aceita ids da lista e acerta reps e tempo pela medida', () => {
    const r = checkAiProgram(
      base([
        { exerciseId: 'Barbell_Bench_Press', sets: 3, repsMin: 10, repsMax: 6, restSec: 120 },
        { exerciseId: 'Plank', sets: 3, repsMin: 8, repsMax: 12, restSec: 60 },
      ]),
      lib,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [bench, plank] = r.program.workouts[0]!.items;
    expect([bench!.repsMin, bench!.repsMax]).toEqual([6, 10]);
    expect(plank).toMatchObject({ repsMin: null, repsMax: null, sec: 30 });
  });

  it('tira ids inventados e repetidos; falha se forem muitos', () => {
    const few = checkAiProgram(
      base([
        { exerciseId: 'Barbell_Bench_Press', sets: 3, restSec: 90 },
        { exerciseId: 'Dumbbell_Curl', sets: 3, restSec: 90 },
        { exerciseId: 'Pushups', sets: 3, restSec: 90 },
        { exerciseId: 'Leg_Press', sets: 3, restSec: 90 },
        { exerciseId: 'Plank', sets: 3, restSec: 90 },
        { exerciseId: 'Made_Up', sets: 3, restSec: 90 },
      ]),
      lib,
    );
    expect(few.ok && few.dropped).toBe(1);
    const many = checkAiProgram(base([{ exerciseId: 'Made_Up', sets: 3, restSec: 90 }, { exerciseId: 'Pushups', sets: 3, restSec: 90 }]), lib);
    expect(many.ok).toBe(false);
  });

  it('rejeita resposta fora do esquema', () => {
    expect(checkAiProgram({ name: 'P', workouts: [] }, lib).ok).toBe(false);
    expect(checkAiProgram('texto', lib).ok).toBe(false);
  });

  it('a resposta falsa passa a validação', () => {
    const big = Array.from({ length: 12 }, (_, i) => ex(`E${i}`));
    expect(checkAiProgram(fakeProgram(big, 'pt-PT'), big).ok).toBe(true);
  });
});

describe('programPrompt', () => {
  it('leva o perfil e o catálogo, nunca dados pessoais', () => {
    const p = programPrompt({ ...EMPTY_PROFILE, goals: ['strength'], trainingDays: [1, 3, 5] }, [lib[0]!], 'pt-BR');
    expect(p).toContain('Brazilian Portuguese');
    expect(p).toContain('Monday, Wednesday, Friday');
    expect(p).toContain('Barbell_Bench_Press | Barbell Bench Press');
  });
});
