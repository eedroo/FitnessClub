import { describe, expect, it } from 'vitest';
import { levelOf, sessionXp, weekGoal, weekRuns, xpForLevel, xpSummary, type XpSession } from './xp';
import { badgeStates } from './badges';
import { strengthLevel } from './strength';
import { addDays } from '@/lib/dates';
import { shiftWeek, sundaysBetween } from '@/lib/weeks';

const s = (id: string, weekStart: string, sets = 20, prs = 0): XpSession => ({ id, weekStart, date: weekStart, sets, prs });

describe('XP e níveis', () => {
  it('sessão: 50 + 2 por série (até 30) + 15 por recorde (até 3); sem séries não conta', () => {
    expect(sessionXp({ sets: 20, prs: 1 })).toBe(50 + 40 + 15);
    expect(sessionXp({ sets: 80, prs: 9 })).toBe(50 + 60 + 45);
    expect(sessionXp({ sets: 0, prs: 0 })).toBe(0);
  });

  it('curva: rápida até ao 10, depois 1000 XP por nível, sem tecto', () => {
    expect([2, 3, 4, 10, 11, 20, 100].map(xpForLevel)).toEqual([100, 300, 600, 4500, 5500, 14500, 94500]);
    expect(levelOf(0).level).toBe(1);
    expect(levelOf(99).level).toBe(1);
    expect(levelOf(100)).toEqual({ level: 2, into: 0, span: 200 });
    expect(levelOf(4499).level).toBe(9);
    expect(levelOf(5600)).toEqual({ level: 11, into: 100, span: 1000 });
    expect(levelOf(1_000_000).level).toBe(10 + Math.floor((1_000_000 - 4500) / 1000));
  });

  it('semana cumprida: o plano, no máximo 2', () => {
    expect([weekGoal(null), weekGoal(1), weekGoal(3), weekGoal(6)]).toEqual([2, 1, 2, 2]);
  });

  it('sequência de semanas: a semana em curso ainda por cumprir não a parte', () => {
    const weeks = ['2026-10-25', '2026-11-01', '2026-11-08', '2026-11-15'];
    const sessions = [s('a', weeks[0]!), s('b', weeks[0]!), s('c', weeks[1]!), s('d', weeks[1]!), s('e', weeks[2]!), s('f', weeks[2]!), s('g', weeks[3]!)];
    expect(weekRuns(sessions, weeks, 2)).toEqual({ current: 3, best: 3, weeks: weeks.slice(0, 3) });
    // Falhar uma semana passada parte a sequência.
    const gap = sessions.filter((x) => x.id !== 'd');
    expect(weekRuns(gap, weeks, 2).current).toBe(1);
  });

  it('resumo soma sessões, séries, recordes e semanas', () => {
    const weeks = ['2026-11-01', '2026-11-08'];
    const r = xpSummary([s('a', weeks[0]!, 10, 1), s('b', weeks[0]!, 10, 0)], weeks, 3);
    expect(r.breakdown).toEqual({ sessions: 100, sets: 40, prs: 15, activities: 0, weeks: 100 });
    expect(r.xp).toBe(255);
    expect(r.level).toBe(2);
  });
});

describe('emblemas', () => {
  const end = (w: string) => addDays(w, 6);
  const consecutive = (a: string, b: string) => shiftWeek(b, 1) === a;

  it('data do 1.º treino, do 1.º recorde e progresso dos outros', () => {
    const list = [s('a', '2026-11-01', 5, 0), s('b', '2026-11-08', 5, 2)];
    const b = Object.fromEntries(badgeStates(list, [], end, consecutive).map((x) => [x.id, x]));
    expect(b.first_workout!.earnedOn).toBe('2026-11-01');
    expect(b.first_pr!.earnedOn).toBe('2026-11-08');
    expect(b.workouts_10).toEqual({ id: 'workouts_10', earnedOn: null, progress: 0.2 });
  });

  it('4 semanas seguidas: ganho no sábado da 4.ª', () => {
    const weeks = sundaysBetween('2026-10-04', '2026-10-25');
    const b = badgeStates([], weeks, end, consecutive).find((x) => x.id === 'streak_4')!;
    expect(b.earnedOn).toBe('2026-10-31');
    const broken = badgeStates([], [weeks[0]!, weeks[1]!, weeks[3]!], end, consecutive).find((x) => x.id === 'streak_4')!;
    expect(broken.earnedOn).toBeNull();
  });
});

describe('níveis de força', () => {
  it('rácio 1RM estimado ÷ peso do corpo (halteres: a soma dos dois)', () => {
    // 54 kg ÷ 77 kg = 0,70 no supino com halteres → prata (0,65); a seguir ouro (0,8).
    const l = strengthLevel('Dumbbell_Bench_Press', { e1rmGrams: 54000, maxReps: 8 }, 77000)!;
    expect(l).toMatchObject({ tier: 'silver', value: 0.7, next: 0.8 });
    expect(l.progress).toBeCloseTo(0.333, 2);
  });
  it('peso do corpo: só repetições; sem peso do corpo não há nível nos de carga', () => {
    expect(strengthLevel('Pullups', { e1rmGrams: null, maxReps: 9 }, null)).toMatchObject({ tier: 'gold', next: 12 });
    expect(strengthLevel('Barbell_Squat', { e1rmGrams: 100000, maxReps: 5 }, null)).toBeNull();
    expect(strengthLevel('Leg_Extensions', { e1rmGrams: 50000, maxReps: 10 }, 70000)).toBeNull();
  });
  it('abaixo do bronze e no diamante', () => {
    expect(strengthLevel('Barbell_Bench_Press_-_Medium_Grip', { e1rmGrams: 20000, maxReps: 5 }, 80000)!.tier).toBeNull();
    expect(strengthLevel('Barbell_Bench_Press_-_Medium_Grip', { e1rmGrams: 130000, maxReps: 5 }, 80000)).toMatchObject({ tier: 'diamond', next: null, progress: 1 });
  });
});

describe('atividades no XP', () => {
  it('1 XP por minuto até 90; contam para a semana e para os treinos, sem séries nem recordes', () => {
    expect(sessionXp({ sets: 0, prs: 0, activityMinutes: 45 })).toBe(45);
    expect(sessionXp({ sets: 0, prs: 0, activityMinutes: 200 })).toBe(90);
    const w = '2026-11-08';
    const run = { id: 'r', weekStart: w, date: w, sets: 0, prs: 0, activityMinutes: 30 };
    const r = xpSummary([s('a', w, 10, 0), run], [w], 2);
    expect(r.breakdown).toEqual({ sessions: 50, sets: 20, prs: 0, activities: 30, weeks: 100 });
    expect([r.sessions, r.activities]).toEqual([1, 1]);
  });
});

describe('padrões de força: exercícios da biblioteca, nunca alongamentos', () => {
  it('todos os ids existem na biblioteca e nenhum é alongamento', async () => {
    const { STRENGTH_STANDARDS } = await import('./strength');
    const lib = (await import('../../../content/exercises/source/exercises.json')).default as { id: string; category: string }[];
    const byId = new Map(lib.map((e) => [e.id, e]));
    for (const id of Object.keys(STRENGTH_STANDARDS)) {
      expect(byId.has(id), id).toBe(true);
      expect(byId.get(id)!.category, id).not.toBe('stretching');
    }
  });
  it('prancha pelo tempo', () => {
    expect(strengthLevel('Plank', { e1rmGrams: null, maxReps: null, maxSec: 75 }, null)).toMatchObject({ tier: 'silver', by: 'sec', next: 90 });
  });
});
