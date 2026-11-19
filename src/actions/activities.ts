'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { requireFeature } from '@/lib/entitlements/server';
import { addDays, compareDates, localDateTimeUtc, toDbDate, todayInTz } from '@/lib/dates';
import { activitySchema, type ActivityInput } from '@/lib/activities/types';

/** Atividades (outros treinos, como no app Saúde): registar, editar e apagar. Recurso `pro`, Zod e verificação de dono. */
type Result<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };
const fail = (error = 'common.errors.generic') => ({ ok: false as const, error });

async function uid(): Promise<string | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  await requireFeature(s.user.id, 'pro');
  return s.user.id;
}

const id = z.string().min(1).max(191);

export async function saveActivity(input: ActivityInput & { id?: string }): Promise<Result<{ id: string }>> {
  const userId = await uid();
  if (!userId) return fail('common.errors.unauthorized');
  const p = activitySchema.safeParse(input);
  if (!p.success) return fail('activities.errors.invalid');
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  const tz = user?.timezone ?? 'Europe/Lisbon';
  const today = todayInTz(tz);
  // Até um ano para trás e nunca no futuro.
  if (compareDates(p.data.date, today) > 0 || compareDates(p.data.date, addDays(today, -366)) < 0) return fail('activities.errors.date');
  const data = {
    type: p.data.type,
    date: toDbDate(p.data.date),
    startedAt: localDateTimeUtc(p.data.date, p.data.time, tz),
    durationSec: p.data.durationMin * 60,
    effort: p.data.effort,
    distanceMeters: p.data.distanceKm != null ? Math.round(p.data.distanceKm * 1000) : null,
    notes: p.data.notes,
  };
  let saved: { id: string };
  if (input.id) {
    const ok = id.safeParse(input.id);
    if (!ok.success) return fail();
    const { count } = await db.activity.updateMany({ where: { id: ok.data, userId }, data });
    if (!count) return fail();
    saved = { id: ok.data };
  } else {
    saved = await db.activity.create({ data: { userId, ...data }, select: { id: true } });
  }
  revalidatePath('/', 'layout');
  return { ok: true, data: saved };
}

export async function deleteActivity(input: string): Promise<Result> {
  const userId = await uid();
  if (!userId) return fail('common.errors.unauthorized');
  const ok = id.safeParse(input);
  if (!ok.success) return fail();
  await db.activity.deleteMany({ where: { id: ok.data, userId } });
  revalidatePath('/', 'layout');
  return { ok: true };
}
