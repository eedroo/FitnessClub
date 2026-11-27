import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { fromDbDate } from '@/lib/dates';
import { sendWithReason } from '@/inngest/client';
import { pushToUser } from '@/lib/notifications/send';
import { friendWorkoutNotification } from '@/lib/notifications/content';
import { blockedIds, friendIds } from './server';

/**
 * «A Jaqueline treinou»: quando alguém termina um treino com séries, os amigos recebem um aviso (no máximo um por
 * amigo e por dia, via `NotificationLog`), salvo quem o desligou nas definições ou tem a pessoa bloqueada.
 */
export async function notifyFriendsTrained(userId: string, sessionId: string): Promise<{ sent: number }> {
  const s = await db.fitnessSession.findFirst({
    where: { id: sessionId, userId, endedAt: { not: null } },
    select: { date: true, workout: { select: { name: true } }, _count: { select: { sets: true } }, user: { select: { socialProfile: { select: { handle: true, displayName: true } } } } },
  });
  const prof = s?.user.socialProfile;
  if (!s || !prof || s._count.sets === 0) return { sent: 0 };
  const friends = [...(await friendIds(userId))];
  if (!friends.length) return { sent: 0 };
  const blocked = await blockedIds(userId);
  const people = await db.user.findMany({
    where: { id: { in: friends.filter((f) => !blocked.has(f)) }, isBot: false, pushSubscriptions: { some: {} }, NOT: { fitnessPrefs: { notifyFriendWorkouts: false } } },
    select: { id: true, locale: true },
  });
  const periodKey = `${userId}:${fromDbDate(s.date)}`;
  let sent = 0;
  for (const p of people) {
    const content = friendWorkoutNotification(p.locale, prof.displayName, s.workout?.name ?? null, s._count.sets, `/u/${prof.handle}`);
    try {
      await db.notificationLog.create({ data: { userId: p.id, kind: 'FRIEND_WORKOUT', periodKey, ...content } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue; // já avisado hoje
      throw err;
    }
    const n = await pushToUser(p.id, { ...content, tag: `friend-${userId}` }).catch(() => 0);
    if (n > 0) {
      await db.notificationLog.updateMany({ where: { userId: p.id, kind: 'FRIEND_WORKOUT', periodKey }, data: { pushed: true } });
      sent++;
    }
  }
  return { sent };
}

/** Depois de terminar um treino: pelo Inngest (sem atrasar a pessoa); sem Inngest, aqui mesmo. */
export async function dispatchFriendTrained(userId: string, sessionId: string): Promise<void> {
  const reason = await sendWithReason([{ name: 'social/friend.trained', data: { userId, sessionId } }]);
  if (reason) await notifyFriendsTrained(userId, sessionId).catch((err) => console.error('[friend-trained]', err));
}
