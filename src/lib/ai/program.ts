import { z } from 'zod';
import type { TrainingProfileData } from '@/lib/fitness/profile';

/**
 * Programa proposto pela IA (Fase B). Puro: candidatos da biblioteca, prompt, esquema da resposta e validação.
 * A IA só pode usar ids da lista de candidatos; itens com ids desconhecidos caem fora e, se caírem muitos, o pedido falha.
 */
export interface CandidateExercise {
  id: string;
  name: string; // em inglês (os nomes da biblioteca)
  category: string;
  equipment: string | null;
  level: string | null;
  primaryMuscles: string[];
  measure: 'REPS_WEIGHT' | 'REPS' | 'DURATION';
  hasImages: boolean;
}

/** Equipamento do perfil → equipamento da biblioteca (free-exercise-db). `null` = sem equipamento indicado. */
const EQUIPMENT_MAP: Record<string, (string | null)[]> = {
  full_gym: ['barbell', 'dumbbell', 'cable', 'machine', 'kettlebells', 'e-z curl bar', 'body only', 'other', 'bands', 'medicine ball', 'exercise ball', 'foam roll', null],
  free_weights: ['barbell', 'dumbbell', 'kettlebells', 'e-z curl bar', 'body only', null],
  home_basic: ['dumbbell', 'body only', 'bands', 'exercise ball', null],
  bodyweight: ['body only', null],
  outdoor: ['body only', 'other', null],
  bands: ['bands', 'body only', null],
};

const MAX_CANDIDATES = 200;

/** Exercícios da biblioteca que servem o perfil: equipamento disponível, sem "strongman" e sem nível "expert" para iniciantes. */
export function pickCandidates(all: CandidateExercise[], profile: Pick<TrainingProfileData, 'equipment' | 'level' | 'goals'>, preferred: Set<string> = new Set()): CandidateExercise[] {
  const kinds = profile.equipment.length ? profile.equipment : ['full_gym'];
  const allowed = new Set<string | null>(kinds.flatMap((k) => EQUIPMENT_MAP[k] ?? []));
  const wantsStretch = profile.goals.includes('health') || profile.goals.includes('sport');
  const filtered = all.filter((e) => {
    if (!allowed.has(e.equipment)) return false;
    if (e.category === 'strongman') return false;
    if (e.category === 'cardio' && !profile.goals.includes('endurance') && !profile.goals.includes('fat_loss')) return false;
    if (profile.level === 'BEGINNER' && (e.level === 'expert' || e.category === 'olympic weightlifting')) return false;
    if (profile.level !== 'ADVANCED' && e.level === 'expert' && e.category !== 'stretching') return false;
    return true;
  });
  // Primeiro os dos modelos (conhecidos e bons), depois os com imagens, depois o resto; alongamentos ficam no fim sem pedido de saúde.
  const score = (e: CandidateExercise) =>
    (preferred.has(e.id) ? 0 : 10) + (e.hasImages ? 0 : 5) + (e.category === 'stretching' && !wantsStretch ? 3 : 0) + (e.level === 'beginner' ? 0 : 1);
  return [...filtered].sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name)).slice(0, MAX_CANDIDATES);
}

// ─── Resposta ────────────────────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  exerciseId: z.string().min(1).max(191),
  sets: z.number().int().min(1).max(10),
  repsMin: z.number().int().min(1).max(100).nullable().optional(),
  repsMax: z.number().int().min(1).max(100).nullable().optional(),
  sec: z.number().int().min(5).max(900).nullable().optional(),
  restSec: z.number().int().min(0).max(600).nullable().optional(),
  /** A nota do exercício neste treino: esforço (RIR), como progredir e uma dica de técnica (séries e reps já se mostram ao lado). */
  note: z.string().trim().max(700).nullable().optional(),
  /** Respostas antigas traziam a dica à parte; junta-se à nota. */
  cue: z.string().trim().max(300).nullable().optional(),
});

export const aiProgramSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(240).nullable().optional(),
  kind: z.enum(['STRENGTH', 'STRETCH', 'MIXED']),
  notes: z.string().trim().max(6000).nullable().optional(),
  workouts: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        notes: z.string().trim().max(1500).nullable().optional(),
        items: z.array(itemSchema).min(1).max(14),
      }),
    )
    .min(1)
    .max(7),
});

export type AiProgram = z.infer<typeof aiProgramSchema>;
export type AiProgramItem = AiProgram['workouts'][number]['items'][number];

/** Esquema para o `responseSchema` do Gemini (o mesmo que `aiProgramSchema`). */
export const AI_PROGRAM_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    description: { type: 'STRING' },
    kind: { type: 'STRING', enum: ['STRENGTH', 'STRETCH', 'MIXED'] },
    notes: { type: 'STRING' },
    workouts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          notes: { type: 'STRING' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                exerciseId: { type: 'STRING' },
                sets: { type: 'INTEGER' },
                repsMin: { type: 'INTEGER', nullable: true },
                repsMax: { type: 'INTEGER', nullable: true },
                sec: { type: 'INTEGER', nullable: true },
                restSec: { type: 'INTEGER' },
                note: { type: 'STRING' },
              },
              required: ['exerciseId', 'sets', 'restSec', 'note'],
              propertyOrdering: ['exerciseId', 'sets', 'repsMin', 'repsMax', 'sec', 'restSec', 'note'],
            },
          },
        },
        required: ['name', 'notes', 'items'],
        propertyOrdering: ['name', 'notes', 'items'],
      },
    },
  },
  required: ['name', 'kind', 'notes', 'workouts'],
  propertyOrdering: ['name', 'description', 'kind', 'notes', 'workouts'],
} as const;

export type ProgramCheck = { ok: true; program: AiProgram; dropped: number } | { ok: false; reason: string };

/**
 * Valida a resposta: Zod, ids só da lista de candidatos (os outros caem fora), reps coerentes, medida certa
 * (tempo só em exercícios de tempo). Falha se faltar mais de 20 % dos itens ou se um treino ficar vazio.
 */
export function checkAiProgram(raw: unknown, candidates: CandidateExercise[]): ProgramCheck {
  const parsed = aiProgramSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: `schema: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}` };
  const byId = new Map(candidates.map((c) => [c.id, c]));
  let total = 0;
  let dropped = 0;
  const workouts = parsed.data.workouts.map((w) => {
    const seen = new Set<string>();
    const items: AiProgramItem[] = [];
    for (const item of w.items) {
      total++;
      const ex = byId.get(item.exerciseId);
      if (!ex || seen.has(item.exerciseId)) {
        dropped++;
        continue;
      }
      seen.add(item.exerciseId);
      if (ex.measure === 'DURATION') {
        items.push({ ...item, repsMin: null, repsMax: null, sec: item.sec ?? 30 });
      } else {
        let min = item.repsMin ?? item.repsMax ?? 8;
        let max = item.repsMax ?? min;
        if (min > max) [min, max] = [max, min];
        items.push({ ...item, repsMin: min, repsMax: max, sec: null });
      }
    }
    return { ...w, items };
  });
  if (workouts.some((w) => w.items.length === 0)) return { ok: false, reason: 'treino vazio depois de tirar ids inválidos' };
  if (dropped > total * 0.2) return { ok: false, reason: `${dropped} de ${total} itens com ids inválidos` };
  return { ok: true, program: { ...parsed.data, workouts }, dropped };
}

// ─── Prompt ──────────────────────────────────────────────────────────────────────────────────────

const LANGUAGE: Record<string, string> = {
  'pt-PT': 'European Portuguese (Portugal), informal "tu"',
  'pt-BR': 'Brazilian Portuguese, informal "você"',
  en: 'English',
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const PROGRAM_SYSTEM = [
  'You are an experienced, evidence-based strength and conditioning coach writing a complete training programme for a fitness app.',
  'Use ONLY exercises from the provided catalogue, referenced by their exact "id". Never invent ids.',
  'One workout per training day the person chose (or a sensible split when no days are given), at most 7 workouts; name each workout with the day and its focus when days are known (e.g. "Monday — Lower A (squat/quads)").',
  'Respect the session length: roughly 1 exercise per 7–9 minutes including rest. Compound lifts first, accessories after.',
  'Rep ranges suited to the goals and level (strength 3–6, hypertrophy ~5–8 for main compounds and 8–15 for accessories, endurance 12–20).',
  'For exercises measured in time ("time"), give "sec" and leave reps null; otherwise give repsMin/repsMax and leave sec null.',
  'Give more weekly volume to the focus muscles without neglecting balance. Respect what the person wants to avoid and any limitation they mention.',
  'Units: kilograms. Write ALL text in the requested language, natural and specific to this person (refer to their level, days, minutes, equipment and goals).',
  '',
  'PROGRAMME "notes" — a coach-style guide (about 250–400 words, not more) in plain text with short section titles on their own line and "- " bullets:',
  '1) One opening paragraph: who this is for (their level, equipment, days per week, minutes) and how the split serves their goals and focus muscles.',
  '2) "Structure and rationale": why this split, why this order (compounds first), the rep ranges used and why.',
  '3) "Progressive overload": RIR target (reps in reserve, e.g. most sets at 1–2 RIR) explained in plain words; double progression (keep the rep range, add reps until the top in all sets, then add load: about +1–2.5 kg upper body, +2.5–5 kg lower body); what to do if a lift stalls for 2 weeks (reduce load 5–10% and build back, or add 1 set for 2–3 weeks).',
  '4) "Weekly sets per muscle": a starting target per muscle group, higher for the focus muscles, and how to adjust (+2 sets if recovering well but not progressing; −2 to −4 if fatigue lingers).',
  '5) "Rest": guidance for compounds vs accessories.',
  '6) "Warm-up" and 7) "Substituting exercises" (swap for a similar movement pattern if a machine is busy or something hurts).',
  '',
  'WORKOUT "notes" — 2–4 sentences: the goal of the day, why the exercises are in this order, and what to focus on.',
  '',
  'EXERCISE "note" (one per exercise, for that workout) — 1–2 short sentences. The app already shows sets, reps and rest next to it: never restate them. Give the effort and how to progress (e.g. "@ 1–2 RIR. Add load when you hit the top of the range on all sets with the same depth and bar speed."), then one short technique cue. Do not repeat the programme notes.',
  '',
  'Never give medical, diet or supplement advice. Keep a neutral, encouraging tone.',
].join('\n');

export function programPrompt(
  profile: TrainingProfileData,
  candidates: CandidateExercise[],
  locale: string,
): string {
  const days = profile.trainingDays.length ? profile.trainingDays.map((d) => WEEKDAYS[d]).join(', ') : 'not given (assume 3)';
  const lines = candidates.map((c) => {
    const kind = c.measure === 'DURATION' ? 'time' : c.measure === 'REPS' ? 'bodyweight reps' : 'weight×reps';
    return `${c.id} | ${c.name} | ${c.primaryMuscles.join('/') || '-'} | ${c.equipment ?? 'none'} | ${c.category} | ${kind}`;
  });
  return [
    `Language for all text: ${LANGUAGE[locale] ?? LANGUAGE['pt-PT']}.`,
    '',
    'Person:',
    `- goals: ${profile.goals.join(', ') || 'general fitness'}`,
    `- level: ${profile.level.toLowerCase()}`,
    `- equipment: ${profile.equipment.join(', ') || 'full gym'}`,
    `- focus muscles: ${profile.focusMuscles.join(', ') || 'none in particular'}`,
    `- training days: ${days}`,
    `- minutes per session: ${profile.sessionMinutes ?? 60}`,
    `- wishes (their words, may be in another language): ${profile.wishes ?? '-'}`,
    `- avoid / limitations (their words): ${profile.avoid ?? '-'}`,
    '',
    'Catalogue (id | name | primary muscles | equipment | category | measure):',
    ...lines,
  ].join('\n');
}

/** Resposta falsa (AI_FAKE=1): três treinos com os primeiros candidatos, para testar o fluxo sem chave. */
export function fakeProgram(candidates: CandidateExercise[], locale: string): AiProgram {
  const pt = locale !== 'en';
  const pick = (from: number) => candidates.slice(from, from + 4);
  const workout = (name: string, from: number) => ({
    name,
    notes: pt ? 'Foco na técnica e em controlar a descida.' : 'Focus on technique and a controlled lowering.',
    items: pick(from).map((c) => ({
      exerciseId: c.id,
      sets: 3,
      repsMin: c.measure === 'DURATION' ? null : 6,
      repsMax: c.measure === 'DURATION' ? null : 10,
      sec: c.measure === 'DURATION' ? 30 : null,
      restSec: 90,
      note: pt
        ? '@ 1–2 RIR. Sobe a carga quando chegares ao topo do intervalo em todas as séries. Tronco firme e amplitude completa.'
        : '@ 1–2 RIR. Add load when you reach the top of the range on all sets. Core tight, full range.',
    })),
  });
  return {
    name: pt ? 'Programa sugerido' : 'Suggested programme',
    description: pt ? 'Três treinos por semana, à medida do teu perfil.' : 'Three workouts a week, tailored to your profile.',
    kind: 'STRENGTH',
    notes: pt
      ? 'Programa de três dias para o teu nível.\n\nEstrutura e lógica\n- Exercícios compostos primeiro, acessórios depois.\n\nSobrecarga progressiva\n- A maioria das séries a 1–2 RIR (repetições em reserva).\n- Soma uma repetição de cada vez até ao topo do intervalo em todas as séries; aí sobe a carga.\n\nAquecimento\n- 5–10 minutos e duas séries leves no primeiro exercício.'
      : 'A three-day programme for your level.\n\nStructure and rationale\n- Compounds first, accessories after.\n\nProgressive overload\n- Most sets at 1–2 RIR (reps in reserve).\n- Add one rep at a time until the top of the range on every set, then add load.\n\nWarm-up\n- 5–10 minutes and two light sets on the first exercise.',
    workouts: [workout('A', 0), workout('B', 4), workout('C', 8)],
  };
}
