'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';

export type WelcomeResult = { ok: true } | { ok: false; error: string };

/** Fecha as boas-vindas (`User.onboardedAt`, idempotente). O cliente chama depois `update()` da sessão. */
export async function finishWelcome(): Promise<WelcomeResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  await db.user.updateMany({ where: { id: session.user.id, onboardedAt: null }, data: { onboardedAt: new Date() } });
  return { ok: true };
}
