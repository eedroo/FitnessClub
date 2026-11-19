import { describe, expect, it } from 'vitest';
import { checkInsight, fakeInsight, numbersIn, weekFacts, type FactSession, type FactSet } from './insights';

const set = (exerciseId: string, weightKg: number, reps: number, prKinds: string[] = []): FactSet => ({
  exerciseId,
  reps,
  weightGrams: weightKg * 1000,
  durationSec: null,
  prKinds,
});
const session = (weekStart: string, sets: FactSet[], workoutName: string | null = 'Push'): FactSession => ({ weekStart, workoutName, sets });

const W = '2026-11-08';
const P = '2026-11-01';
const H = ['2026-11-01', '2026-10-25', '2026-10-18'];

const input = (sessions: FactSession[]) => ({
  weekStart: W,
  weekEnd: '2026-11-14',
  sessions,
  names: { bench: 'Supino', squat: 'Agachamento' },
  plannedDays: 3,
  goals: ['strength'],
  level: 'INTERMEDIATE',
});

describe('weekFacts', () => {
  it('conta a semana, compara com a anterior e lista recordes', () => {
    const f = weekFacts(
      input([
        session(W, [set('bench', 80, 8), set('bench', 80, 8, ['weight'])]),
        session(W, [set('squat', 100, 5)], 'Legs'),
        session(P, [set('bench', 75, 8)]),
      ]),
      P,
      H,
    );
    expect(f).toMatchObject({ sessions: 2, prevSessions: 1, sets: 3, prevSets: 1, reps: 21, volumeKg: 1780, prevVolumeKg: 600 });
    expect(f.volumeChangePct).toBe(196.7);
    expect(f.workouts).toEqual(['Push', 'Legs']);
    expect(f.prs).toEqual([{ exercise: 'Supino', kinds: ['weight'], weightKg: 80, reps: 8 }]);
    expect(f.topExercises[0]).toMatchObject({ exercise: 'Supino', sets: 2, bestKg: 80, prevBestKg: 75 });
  });

  it('exercício parado: 2+ semanas antes sem passar o melhor', () => {
    const f = weekFacts(
      input([session(W, [set('squat', 100, 5)]), session(H[0]!, [set('squat', 100, 5)]), session(H[1]!, [set('squat', 100, 5)])]),
      P,
      H,
    );
    expect(f.stalled).toEqual([{ exercise: 'Agachamento', weeks: 3 }]);
  });

  it('semana sem sessões: zeros e sem percentagem sem base', () => {
    const f = weekFacts(input([]), P, H);
    expect(f).toMatchObject({ sessions: 0, volumeKg: 0, volumeChangePct: null, prs: [], stalled: [] });
  });
});

describe('checkInsight', () => {
  const facts = weekFacts(input([session(W, [set('bench', 80, 8)]), session(P, [set('bench', 75, 8)])]), P, H);
  const ok = { headline: 'Boa semana', summary: 'Levantaste 640 kg, contra 600 kg.', wins: [], improve: ['Descansa 2 minutos.'], nextWeek: 'Mais uma rep.' };

  it('aceita números dos factos (vírgula ou ponto) e contagens pequenas', () => {
    expect(checkInsight(ok, facts).ok).toBe(true);
    expect(checkInsight({ ...ok, summary: 'Volume +6,7 % (40 kg).' }, facts).ok).toBe(true);
  });

  it('rejeita números inventados', () => {
    const r = checkInsight({ ...ok, summary: 'Ganhaste 12 % de força.' }, facts);
    expect(r.ok).toBe(false);
  });

  it('rejeita fora do esquema (improve vazio)', () => {
    expect(checkInsight({ ...ok, improve: [] }, facts).ok).toBe(false);
  });

  it('a resposta falsa passa', () => {
    expect(checkInsight(fakeInsight(facts, 'pt-PT'), facts).ok).toBe(true);
  });
});

describe('numbersIn', () => {
  it('lê formatos PT e EN', () => {
    expect(numbersIn('2.690 kg e 12,5 %')).toEqual([[2690, 2.69], [12.5]]);
    expect(numbersIn('1,234.5 kg')).toEqual([[1234.5]]);
    expect(numbersIn('2 690 kg')).toEqual([[2690]]);
  });
});
