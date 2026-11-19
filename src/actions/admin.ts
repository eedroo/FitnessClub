'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { FEATURE_KEYS } from '@/lib/entitlements/features';
import { generateJson } from '@/lib/ai/gemini';

export type AdminResult = { ok: true } | { ok: false; error: string };

const featureKey = z.enum(FEATURE_KEYS as [string, ...string[]]);
const userId = z.string().min(1).max(40);

const planSchema = z.object({
  userId,
  plan: z.enum(['FREE', 'PREMIUM']),
  source: z.enum(['MANUAL', 'GIFT']),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

/** Plano de uma pessoa. `planSince` = agora quando passa a PREMIUM; FREE limpa origem e fim. */
export async function setUserPlan(
  id: string,
  plan: 'FREE' | 'PREMIUM',
  source: 'MANUAL' | 'GIFT',
  expiresAt: string | null,
): Promise<AdminResult> {
  await requireAdmin();
  const p = planSchema.safeParse({ userId: id, plan, source, expiresAt });
  if (!p.success) return { ok: false, error: 'Dados inválidos.' };
  const current = await db.user.findUnique({ where: { id: p.data.userId }, select: { plan: true } });
  if (!current) return { ok: false, error: 'Utilizador não encontrado.' };
  await db.user.update({
    where: { id: p.data.userId },
    data:
      p.data.plan === 'PREMIUM'
        ? {
            plan: 'PREMIUM',
            planSource: p.data.source,
            planExpiresAt: p.data.expiresAt ? new Date(`${p.data.expiresAt}T23:59:59Z`) : null,
            ...(current.plan !== 'PREMIUM' && { planSince: new Date() }),
          }
        : { plan: 'FREE', planSource: null, planExpiresAt: null, planSince: null },
  });
  revalidatePath(`/admin/users/${p.data.userId}`);
  revalidatePath('/admin/users');
  return { ok: true };
}

/** Excepção por pessoa: `null` apaga (volta a seguir a regra global). */
export async function setFeatureOverride(id: string, key: string, enabled: boolean | null): Promise<AdminResult> {
  await requireAdmin();
  const p = z.object({ userId, key: featureKey, enabled: z.boolean().nullable() }).safeParse({ userId: id, key, enabled });
  if (!p.success) return { ok: false, error: 'Dados inválidos.' };
  if (p.data.enabled === null) {
    await db.featureOverride.deleteMany({ where: { userId: p.data.userId, key: p.data.key } });
  } else {
    await db.featureOverride.upsert({
      where: { userId_key: { userId: p.data.userId, key: p.data.key } },
      create: { userId: p.data.userId, key: p.data.key, enabled: p.data.enabled },
      update: { enabled: p.data.enabled },
    });
  }
  revalidatePath(`/admin/users/${p.data.userId}`);
  revalidatePath('/admin/features');
  return { ok: true };
}

/** Estado global de uma funcionalidade (efeito imediato, sem novo deploy). */
export async function setFeatureRollout(key: string, rollout: 'HIDDEN' | 'PREMIUM' | 'ALL'): Promise<AdminResult> {
  await requireAdmin();
  const p = z.object({ key: featureKey, rollout: z.enum(['HIDDEN', 'PREMIUM', 'ALL']) }).safeParse({ key, rollout });
  if (!p.success) return { ok: false, error: 'Dados inválidos.' };
  await db.featureFlag.upsert({ where: { key: p.data.key }, create: p.data, update: { rollout: p.data.rollout } });
  revalidatePath('/admin/features');
  return { ok: true };
}

const modelId = z.string().regex(/^gemini-[a-z0-9.-]{1,60}$/);

export type AiModelTest =
  | { ok: true; model: string; ms: number; inputTokens: number; outputTokens: number; answer: string }
  | { ok: false; model: string; ms: number; error: string };

/**
 * Testa um modelo do Gemini com um pedido pequeno (sem dados de ninguém): diz se responde, quanto demora e quantos
 * tokens gasta. Para escolher o modelo antes de o pôr em GEMINI_MODEL na Vercel.
 */
export async function testAiModel(model: string): Promise<AiModelTest> {
  await requireAdmin();
  const m = modelId.safeParse(model.trim());
  if (!m.success) return { ok: false, model, ms: 0, error: 'Nome de modelo inválido (ex.: gemini-3.5-flash-lite).' };
  const started = Date.now();
  try {
    const res = await generateJson({
      model: m.data,
      system: 'You are a strength coach. Answer in European Portuguese.',
      prompt: 'Give one short tip (max 20 words) for someone starting to bench press, and a 3-exercise push workout with sets and reps.',
      schema: {
        type: 'OBJECT',
        properties: {
          tip: { type: 'STRING' },
          workout: { type: 'ARRAY', items: { type: 'OBJECT', properties: { exercise: { type: 'STRING' }, sets: { type: 'INTEGER' }, reps: { type: 'STRING' } }, required: ['exercise', 'sets', 'reps'] } },
        },
        required: ['tip', 'workout'],
      },
      thinkingBudget: 1024,
      fake: () => ({ tip: 'Omoplatas juntas e pés firmes no chão.', workout: [{ exercise: 'Supino', sets: 3, reps: '6-10' }] }),
    });
    return { ok: true, model: res.model, ms: Date.now() - started, inputTokens: res.inputTokens, outputTokens: res.outputTokens, answer: JSON.stringify(res.json, null, 1).slice(0, 800) };
  } catch (err) {
    return { ok: false, model: m.data, ms: Date.now() - started, error: (err instanceof Error ? err.message : String(err)).slice(0, 600) };
  }
}
