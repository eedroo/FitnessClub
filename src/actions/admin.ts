'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { FEATURE_KEYS } from '@/lib/entitlements/features';
import { generateJson } from '@/lib/ai/gemini';
import { pushToUser } from '@/lib/notifications/send';
import { premiumActiveNotification } from '@/lib/notifications/content';
import { announceRanking } from '@/lib/social/ranking';
import { createBots, deleteBots, runBotsDay, setBotsVisible } from '@/lib/bots/server';

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
  const current = await db.user.findUnique({ where: { id: p.data.userId }, select: { plan: true, premiumRequestedAt: true, locale: true } });
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
            premiumRequestedAt: null,
          }
        : { plan: 'FREE', planSource: null, planExpiresAt: null, planSince: null },
  });
  // Tinha pedido no app: avisa que o Premium está activo.
  if (p.data.plan === 'PREMIUM' && current.premiumRequestedAt) {
    await pushToUser(p.data.userId, { ...premiumActiveNotification(current.locale), tag: 'premium-active' }).catch(() => 0);
  }
  revalidatePath(`/admin/users/${p.data.userId}`);
  revalidatePath('/admin/users');
  return { ok: true };
}

/** Recusar (ou arquivar) um pedido de Premium: some da lista sem mudar o plano. */
export async function dismissPremiumRequest(id: string): Promise<AdminResult> {
  await requireAdmin();
  if (!userId.safeParse(id).success) return { ok: false, error: 'Dados inválidos.' };
  await db.user.updateMany({ where: { id }, data: { premiumRequestedAt: null } });
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

// ─── Moderação da comunidade (Fase C) ────────────────────────────────────────────────────────────

/** Esconder ou voltar a mostrar um post ou comentário denunciado e fechar as denúncias dele. */
export async function moderate(target: 'POST' | 'COMMENT', id: string, hide: boolean): Promise<AdminResult> {
  await requireAdmin();
  const p = z.object({ target: z.enum(['POST', 'COMMENT']), id: z.string().min(1).max(191) }).safeParse({ target, id });
  if (!p.success) return { ok: false, error: 'Dados inválidos.' };
  const data = { hiddenAt: hide ? new Date() : null };
  if (p.data.target === 'POST') await db.post.updateMany({ where: { id: p.data.id }, data });
  else await db.postComment.updateMany({ where: { id: p.data.id }, data });
  await db.report.updateMany({ where: { target: p.data.target, targetId: p.data.id, resolvedAt: null }, data: { resolvedAt: new Date() } });
  revalidatePath('/admin/reports');
  return { ok: true };
}

/** Fechar uma denúncia sem acção. */
export async function dismissReport(id: string): Promise<AdminResult> {
  await requireAdmin();
  const p = z.string().min(1).max(191).safeParse(id);
  if (!p.success) return { ok: false, error: 'Dados inválidos.' };
  await db.report.updateMany({ where: { id: p.data }, data: { resolvedAt: new Date() } });
  revalidatePath('/admin/reports');
  return { ok: true };
}

/** Anúncio do ranking semanal por push a todos os que estão no ranking e têm notificações (enviar uma vez). */
export async function sendRankingAnnouncement(): Promise<{ ok: true; people: number; sent: number } | { ok: false; error: string }> {
  await requireAdmin();
  const r = await announceRanking();
  return { ok: true, ...r };
}

// ─── Bots (contas de demonstração) ───────────────────────────────────────────────────────────────

export type BotAction = 'create' | 'run' | 'hide' | 'show' | 'delete';

/** Criar, rodar o dia agora, ocultar, mostrar ou apagar os bots. Devolve uma frase para o admin. */
export async function botAction(action: BotAction): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  await requireAdmin();
  const a = z.enum(['create', 'run', 'hide', 'show', 'delete']).safeParse(action);
  if (!a.success) return { ok: false, error: 'Acção inválida.' };
  let message: string;
  if (a.data === 'create') message = `${await createBots()} bot(s) criado(s) com histórico.`;
  else if (a.data === 'run') {
    const r = await runBotsDay();
    message = `Hoje: ${r.trained} treino(s), ${r.posted} publicação(ões).`;
  } else if (a.data === 'hide') {
    await setBotsVisible(false);
    message = 'Bots ocultos: saíram do feed, perfis, pesquisa e ranking, e deixaram de treinar.';
  } else if (a.data === 'show') {
    await setBotsVisible(true);
    message = 'Bots visíveis outra vez.';
  } else message = `${await deleteBots()} bot(s) apagado(s), com treinos e publicações.`;
  revalidatePath('/', 'layout');
  return { ok: true, message };
}

