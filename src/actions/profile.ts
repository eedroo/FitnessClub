'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { toDbDate, todayInTz } from '@/lib/dates';
import { parseKgToGrams } from '@/lib/weight';
import { WEIGHT_LIMITS } from '@/lib/body/weight';
import { trainingProfileSchema, type TrainingProfileInput } from '@/lib/fitness/profile';

export type ProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Grava o perfil de treino (onboarding e definições). Aberto a quem tem sessão (sem `pro` também). O peso, se vier,
 * entra no peso diário de hoje, e só com o consentimento de dados de saúde.
 */
export async function saveTrainingProfile(input: TrainingProfileInput & { weightKg?: string }): Promise<ProfileResult> {
  const s = await auth();
  const uid = s?.user?.id;
  if (!uid) return { ok: false, error: 'common.errors.unauthorized' };
  const p = trainingProfileSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'fitness.profile.errors.invalid' };
  const w = z.string().max(10).optional().safeParse(input.weightKg);
  if (!w.success) return { ok: false, error: 'body.errors.weight' };

  let grams: number | null = null;
  if (w.data?.trim()) {
    try {
      grams = parseKgToGrams(w.data);
    } catch {
      return { ok: false, error: 'body.errors.weight' };
    }
    if (grams === null || grams < WEIGHT_LIMITS.minGrams || grams > WEIGHT_LIMITS.maxGrams) return { ok: false, error: 'body.errors.weight' };
  }

  await db.trainingProfile.upsert({ where: { userId: uid }, create: { userId: uid, ...p.data }, update: p.data });
  if (grams !== null) {
    const user = await db.user.findUnique({ where: { id: uid }, select: { timezone: true, wellbeingConsentAt: true } });
    if (user?.wellbeingConsentAt) {
      const date = toDbDate(todayInTz(user.timezone));
      await db.bodyWeightEntry.upsert({ where: { userId_date: { userId: uid, date } }, create: { userId: uid, date, grams }, update: { grams } });
    }
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
