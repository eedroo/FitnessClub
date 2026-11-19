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

const MAX_CANDIDATES = 320;

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
  note: z.string().trim().max(400).nullable().optional(),
});

export const aiProgramSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(240).nullable().optional(),
  kind: z.enum(['STRENGTH', 'STRETCH', 'MIXED']),
  notes: z.string().trim().max(2000).nullable().optional(),
  workouts: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        notes: z.string().trim().max(800).nullable().optional(),
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
              required: ['exerciseId', 'sets', 'restSec'],
              propertyOrdering: ['exerciseId', 'sets', 'repsMin', 'repsMax', 'sec', 'restSec', 'note'],
            },
          },
        },
        required: ['name', 'items'],
        propertyOrdering: ['name', 'notes', 'items'],
      },
    },
  },
  required: ['name', 'kind', 'workouts'],
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
  'You are an experienced strength and conditioning coach writing a training programme for a fitness app.',
  'Use ONLY exercises from the provided catalogue, referenced by their exact "id". Never invent ids.',
  'One workout per training day the person chose (or a sensible split when no days are given), at most 7 workouts.',
  'Respect the session length: roughly 1 exercise per 7–9 minutes including rest.',
  'Use rep ranges suited to the goals (strength 3–6, hypertrophy 6–12, endurance 12–20) and to the level; compound lifts first.',
  'For exercises measured in time ("time"), give "sec" and leave reps null; otherwise give repsMin/repsMax and leave sec null.',
  'Give the most attention (more volume) to the focus muscles, without neglecting balance.',
  'Respect what the person wants to avoid; never include exercises that clash with limitations they mention.',
  'Notes: programme notes explain the logic, how to progress (double progression: add reps until the top of the range in every set, then add load) and how to warm up;',
  'workout notes give the focus of the day; exercise notes are short technique cues (1–2 sentences).',
  'Never give medical, diet or supplement advice. Keep a neutral, encouraging tone. Write all text in the requested language.',
].join(' ');

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
      note: pt ? 'Mantém o tronco firme e a amplitude completa.' : 'Keep your core tight and use the full range.',
    })),
  });
  return {
    name: pt ? 'Programa sugerido' : 'Suggested programme',
    description: pt ? 'Três treinos por semana, à medida do teu perfil.' : 'Three workouts a week, tailored to your profile.',
    kind: 'STRENGTH',
    notes: pt
      ? 'Aquece 5–10 minutos. Em cada exercício, soma uma repetição de cada vez até chegares ao topo do intervalo em todas as séries; aí sobe a carga.'
      : 'Warm up for 5–10 minutes. In each exercise add one rep at a time until you reach the top of the range in every set, then add load.',
    workouts: [workout('A', 0), workout('B', 4), workout('C', 8)],
  };
}
