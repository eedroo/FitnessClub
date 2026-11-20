import { z } from 'zod';
import raw from '../../../content/fitness/templates.json';

/**
 * Modelos de programa: PPL, Full body A/B, Upper/Lower, Alongamento diário e Mobilidade + ginástica. Copiar um modelo cria
 * registos normais da pessoa. Os nomes vivem em `messages` (`fitness.templates.<id>`).
 */
const itemSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(10),
  repsMin: z.number().int().min(1).max(100).optional(),
  repsMax: z.number().int().min(1).max(100).optional(),
  sec: z.number().int().min(5).max(600).optional(),
  restSec: z.number().int().min(0).max(600).optional(),
});

export const templatesSchema = z.object({
  version: z.number().int(),
  templates: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z]+$/),
        kind: z.enum(['STRENGTH', 'STRETCH', 'MIXED']),
        /** Com notas de programa e de treino em `messages` (`notes`, `workoutNotes.<key>`). */
        notes: z.boolean().optional(),
        workouts: z.array(z.object({ key: z.string().regex(/^[a-zA-Z]+$/), items: z.array(itemSchema).min(1) })).min(1),
      }),
    )
    .min(1),
});

export type FitnessTemplate = z.infer<typeof templatesSchema>['templates'][number];

export const FITNESS_TEMPLATES: FitnessTemplate[] = templatesSchema.parse(raw).templates;

export function findTemplate(id: string): FitnessTemplate | null {
  return FITNESS_TEMPLATES.find((t) => t.id === id) ?? null;
}
