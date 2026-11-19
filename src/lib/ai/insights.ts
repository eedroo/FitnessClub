import { z } from 'zod';
import type { DateISO } from '@/lib/dates';
import { e1rm } from '@/lib/fitness/progress';

/**
 * Retrospectiva semanal (Fase B). Puro. A app calcula os números (`weekFacts`); a IA só os interpreta
 * e cada número que escreve tem de existir nos factos (`checkInsight`), como no Guia do MYGLOW.
 */
export interface FactSet {
  exerciseId: string;
  reps: number | null;
  weightGrams: number | null;
  durationSec: number | null;
  prKinds: string[];
}

export interface FactSession {
  weekStart: DateISO; // domingo da semana da sessão
  workoutName: string | null;
  sets: FactSet[];
}

export interface WeekInput {
  weekStart: DateISO;
  weekEnd: DateISO;
  /** Sessões terminadas da semana analisada, da anterior e das 3 antes da analisada (para exercícios parados). */
  sessions: FactSession[];
  names: Record<string, string>;
  plannedDays: number | null;
  goals: string[];
  level: string;
}

export interface WeekFacts {
  weekStart: DateISO;
  weekEnd: DateISO;
  goals: string[];
  level: string;
  plannedDays: number | null;
  sessions: number;
  prevSessions: number;
  sets: number;
  prevSets: number;
  reps: number;
  prevReps: number;
  volumeKg: number;
  prevVolumeKg: number;
  volumeChangePct: number | null;
  workouts: string[];
  prs: { exercise: string; kinds: string[]; weightKg: number | null; reps: number | null }[];
  topExercises: { exercise: string; sets: number; volumeKg: number; bestKg: number | null; prevBestKg: number | null }[];
  stalled: { exercise: string; weeks: number }[];
}

const kg = (g: number) => Math.round(g / 100) / 10;
const volume = (sets: FactSet[]) => sets.reduce((n, s) => n + (s.reps ?? 0) * (s.weightGrams ?? 0), 0);

export function weekFacts(input: WeekInput, prevWeekStart: DateISO, historyWeeks: DateISO[]): WeekFacts {
  const name = (id: string) => input.names[id] ?? id;
  const inWeek = (w: DateISO) => input.sessions.filter((s) => s.weekStart === w);
  const cur = inWeek(input.weekStart);
  const prev = inWeek(prevWeekStart);
  const curSets = cur.flatMap((s) => s.sets);
  const prevSets = prev.flatMap((s) => s.sets);
  const vol = volume(curSets);
  const prevVol = volume(prevSets);

  const prs = curSets
    .filter((s) => s.prKinds.length > 0)
    .map((s) => ({ exercise: name(s.exerciseId), kinds: s.prKinds, weightKg: s.weightGrams != null ? kg(s.weightGrams) : null, reps: s.reps }))
    .slice(0, 6);

  const best = (sets: FactSet[], id: string) => {
    const w = sets.filter((s) => s.exerciseId === id && s.weightGrams != null).map((s) => s.weightGrams!);
    return w.length ? kg(Math.max(...w)) : null;
  };
  const exIds = [...new Set(curSets.map((s) => s.exerciseId))];
  const topExercises = exIds
    .map((id) => {
      const sets = curSets.filter((s) => s.exerciseId === id);
      return { exercise: name(id), sets: sets.length, volumeKg: kg(volume(sets)), bestKg: best(curSets, id), prevBestKg: best(prevSets, id), _vol: volume(sets) };
    })
    .sort((a, b) => b._vol - a._vol || b.sets - a.sets)
    .slice(0, 5)
    .map(({ _vol, ...rest }) => rest);

  // Parado: feito em 2+ das 3 semanas anteriores e o melhor e1RM desta semana não passa o melhor dessas semanas.
  const topE1rm = (sets: FactSet[]) => Math.max(0, ...sets.map((s) => (s.weightGrams && s.reps ? (e1rm(s.weightGrams, s.reps) ?? 0) : 0)));
  const stalled: WeekFacts['stalled'] = [];
  for (const id of exIds) {
    const now = topE1rm(curSets.filter((s) => s.exerciseId === id));
    if (now <= 0) continue;
    const before = historyWeeks.map((w) => inWeek(w).flatMap((s) => s.sets).filter((s) => s.exerciseId === id)).filter((sets) => sets.length > 0);
    if (before.length < 2) continue;
    if (now <= Math.max(...before.map(topE1rm))) stalled.push({ exercise: name(id), weeks: before.length + 1 });
  }

  return {
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    goals: input.goals,
    level: input.level,
    plannedDays: input.plannedDays,
    sessions: cur.length,
    prevSessions: prev.length,
    sets: curSets.length,
    prevSets: prevSets.length,
    reps: curSets.reduce((n, s) => n + (s.reps ?? 0), 0),
    prevReps: prevSets.reduce((n, s) => n + (s.reps ?? 0), 0),
    volumeKg: kg(vol),
    prevVolumeKg: kg(prevVol),
    volumeChangePct: prevVol > 0 ? Math.round(((vol - prevVol) / prevVol) * 1000) / 10 : null,
    workouts: [...new Set(cur.map((s) => s.workoutName).filter((n): n is string => !!n))],
    prs,
    topExercises,
    stalled: stalled.slice(0, 4),
  };
}

// ─── Resposta ────────────────────────────────────────────────────────────────────────────────────

export const insightSchema = z.object({
  headline: z.string().trim().min(1).max(110),
  summary: z.string().trim().min(1).max(600),
  wins: z.array(z.string().trim().min(1).max(240)).max(3),
  improve: z.array(z.string().trim().min(1).max(240)).min(1).max(3),
  nextWeek: z.string().trim().min(1).max(280),
});

export type Insight = z.infer<typeof insightSchema>;

export const INSIGHT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    headline: { type: 'STRING' },
    summary: { type: 'STRING' },
    wins: { type: 'ARRAY', items: { type: 'STRING' } },
    improve: { type: 'ARRAY', items: { type: 'STRING' } },
    nextWeek: { type: 'STRING' },
  },
  required: ['headline', 'summary', 'wins', 'improve', 'nextWeek'],
  propertyOrdering: ['headline', 'summary', 'wins', 'improve', 'nextWeek'],
} as const;

/** Todos os números que a IA pode escrever: os dos factos (e arredondados) e contagens pequenas (0–10, 2,5). */
export function allowedNumbers(facts: WeekFacts): number[] {
  const out = new Set<number>([2.5]);
  for (let i = 0; i <= 10; i++) out.add(i);
  const walk = (v: unknown) => {
    if (typeof v === 'number' && Number.isFinite(v)) {
      out.add(v);
      out.add(Math.abs(v));
      out.add(Math.round(v));
      out.add(Math.round(Math.abs(v)));
      out.add(Math.round(v * 10) / 10);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) v.split('-').forEach((p) => out.add(Number(p)));
  };
  walk(facts);
  // Diferenças contra a semana anterior também são factos.
  out.add(Math.abs(facts.sessions - facts.prevSessions));
  out.add(Math.abs(facts.sets - facts.prevSets));
  out.add(Math.abs(facts.reps - facts.prevReps));
  out.add(Math.round(Math.abs(facts.volumeKg - facts.prevVolumeKg) * 10) / 10);
  out.add(Math.round(Math.abs(facts.volumeKg - facts.prevVolumeKg)));
  return [...out];
}

/**
 * Números num texto. Cada um vem com as leituras possíveis ("2.690" pode ser 2690 ou 2,69; "12,5" é 12,5),
 * para aceitar tanto a vírgula decimal (PT) como o ponto (EN).
 */
export function numbersIn(text: string): number[][] {
  const out: number[][] = [];
  for (const m of text.matchAll(/\d+(?:[.,\u00a0\u202f ]\d+)*/g)) {
    const raw = m[0].replace(/[\u00a0\u202f ](?=\d{3}\b)/g, '');
    const parts = raw.split(/[\u00a0\u202f ]/);
    for (const part of parts) {
      const seps = part.match(/[.,]/g) ?? [];
      if (seps.length === 0) {
        out.push([Number(part)]);
        continue;
      }
      const last = Math.max(part.lastIndexOf(','), part.lastIndexOf('.'));
      const decimal = Number(`${part.slice(0, last).replace(/[.,]/g, '')}.${part.slice(last + 1)}`);
      const thousands = Number(part.replace(/[.,]/g, ''));
      out.push(part.length - last - 1 === 3 ? [thousands, decimal] : [decimal]);
    }
  }
  return out;
}

export type InsightCheck = { ok: true; insight: Insight } | { ok: false; reason: string };

/** Zod + cada número do texto tem de existir nos factos. */
export function checkInsight(raw: unknown, facts: WeekFacts): InsightCheck {
  const parsed = insightSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: `schema: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}` };
  const allowed = allowedNumbers(facts);
  const i = parsed.data;
  const text = [i.headline, i.summary, ...i.wins, ...i.improve, i.nextWeek].join('\n');
  const bad = numbersIn(text)
    .filter((readings) => !readings.some((n) => allowed.some((a) => Math.abs(a - n) < 0.051)))
    .map((r) => r[0]);
  if (bad.length) return { ok: false, reason: `números fora dos factos: ${bad.slice(0, 5).join(', ')}` };
  return { ok: true, insight: i };
}

// ─── Prompt ──────────────────────────────────────────────────────────────────────────────────────

const LANGUAGE: Record<string, string> = {
  'pt-PT': 'European Portuguese (Portugal), informal "tu", decimal comma',
  'pt-BR': 'Brazilian Portuguese, informal "você", decimal comma',
  en: 'English, decimal point',
};

export const INSIGHT_SYSTEM = [
  'You are a supportive, honest strength coach writing a short weekly review inside a training app.',
  'The app computed every number in FACTS; you only interpret them in light of the person\'s goals and level.',
  'Only write numbers that appear in FACTS (or simple counts up to 10). Never compute new numbers, percentages or estimates, never invent exercises or sessions.',
  'Compare with the previous week. "plannedDays" is how many days they planned per week (null = unknown).',
  '"stalled" lists exercises whose estimated max did not improve for several weeks: suggest one practical change (rep range, technique, rest, a variation).',
  'If the week had few or no sessions, be kind and suggest a realistic restart. Never give medical, diet or supplement advice, never comment on body weight or appearance.',
  'headline: one short sentence. summary: 2–3 sentences. wins: up to 3 bullets (empty if nothing to celebrate). improve: 1–3 concrete bullets. nextWeek: one actionable focus.',
  'Write naturally in the requested language; exercise names may stay as given.',
].join(' ');

export function insightPrompt(facts: WeekFacts, locale: string): string {
  return `Language: ${LANGUAGE[locale] ?? LANGUAGE['pt-PT']}.\n\nFACTS (weights in kg):\n${JSON.stringify(facts, null, 1)}`;
}

/** Resposta falsa (AI_FAKE=1), só com números dos factos. */
export function fakeInsight(facts: WeekFacts, locale: string): Insight {
  const en = locale === 'en';
  return {
    headline: en ? `${facts.sessions} sessions this week` : `${facts.sessions} sessões nesta semana`,
    summary: en
      ? `You lifted ${facts.volumeKg} kg in total, against ${facts.prevVolumeKg} kg the week before.`
      : `Levantaste ${facts.volumeKg} kg no total, contra ${facts.prevVolumeKg} kg na semana anterior.`,
    wins: facts.prs.length ? [en ? `New record in ${facts.prs[0]!.exercise}.` : `Recorde novo em ${facts.prs[0]!.exercise}.`] : [],
    improve: [en ? 'Keep the rest between sets consistent.' : 'Mantém o descanso entre séries constante.'],
    nextWeek: en ? 'Add one rep to your main lifts.' : 'Soma uma repetição nos exercícios principais.',
  };
}
