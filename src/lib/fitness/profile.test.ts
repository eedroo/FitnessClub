import { describe, expect, it } from 'vitest';
import { recommendTemplate, trainingProfileSchema } from './profile';

describe('trainingProfileSchema', () => {
  it('limpa repetições, músculos desconhecidos e texto vazio; ordena os dias', () => {
    const p = trainingProfileSchema.parse({
      goals: ['strength', 'strength'],
      level: 'INTERMEDIATE',
      equipment: ['full_gym'],
      focusMuscles: ['chest', 'chest', 'nariz'],
      trainingDays: [5, 1, 3, 1],
      sessionMinutes: 60,
      wishes: '   ',
      avoid: ' burpees ',
    });
    expect(p).toMatchObject({ goals: ['strength'], focusMuscles: ['chest'], trainingDays: [1, 3, 5], wishes: null, avoid: 'burpees' });
  });

  it('rejeita valores fora da lista', () => {
    expect(trainingProfileSchema.safeParse({ goals: ['fly'], level: 'BEGINNER', equipment: [], focusMuscles: [], trainingDays: [], sessionMinutes: null, wishes: null, avoid: null }).success).toBe(false);
    expect(trainingProfileSchema.safeParse({ goals: [], level: 'BEGINNER', equipment: [], focusMuscles: [], trainingDays: [7], sessionMinutes: null, wishes: null, avoid: null }).success).toBe(false);
  });
});

describe('recommendTemplate', () => {
  const base = { level: 'INTERMEDIATE' as const, equipment: ['full_gym' as const], goals: ['hypertrophy' as const] };
  it('pelos dias por semana', () => {
    expect(recommendTemplate({ ...base, trainingDays: [1, 2, 4, 5] })).toBe('upperlower');
    expect(recommendTemplate({ ...base, trainingDays: [1, 3, 5] })).toBe('ppl');
    expect(recommendTemplate({ ...base, level: 'BEGINNER', trainingDays: [1, 3, 5] })).toBe('fullbody');
    expect(recommendTemplate({ ...base, trainingDays: [2] })).toBe('fullbody');
  });

  it('só saúde e sem ginásio → alongamentos', () => {
    expect(recommendTemplate({ level: 'BEGINNER', equipment: ['bodyweight'], goals: ['health'], trainingDays: [1, 3] })).toBe('stretch');
  });
});
