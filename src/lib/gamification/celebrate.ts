import 'server-only';
import { db } from '@/lib/db';
import { getGamification } from './server';
import type { BadgeId } from './badges';

/**
 * Emblemas novos para celebrar (pop-up). Barato na maioria das aberturas: só calcula a gamificação quando houve um
 * treino terminado ou uma atividade desde a última verificação. Na primeira vez (`badgesSeenAt` vazio) os emblemas
 * que a pessoa já tinha ficam como vistos, sem pop-up.
 */
export async function newBadges(userId: string): Promise<{ id: BadgeId; earnedOn: string }[]> {
  const prefs = await db.fitnessPrefs.findUnique({ where: { userId }, select: { badgesSeen: true, badgesSeenAt: true } });
  if (!prefs) return [];
  const now = new Date();
  if (prefs.badgesSeenAt) {
    const [session, activity] = await Promise.all([
      db.fitnessSession.findFirst({ where: { userId, endedAt: { gt: prefs.badgesSeenAt } }, select: { id: true } }),
      db.activity.findFirst({ where: { userId, createdAt: { gt: prefs.badgesSeenAt } }, select: { id: true } }),
    ]);
    if (!session && !activity) return [];
  }
  const earned = (await getGamification(userId)).badges.filter((b) => b.earnedOn);
  if (!prefs.badgesSeenAt) {
    await db.fitnessPrefs.update({ where: { userId }, data: { badgesSeen: earned.map((b) => b.id), badgesSeenAt: now } });
    return [];
  }
  const seen = new Set(prefs.badgesSeen);
  const fresh = earned.filter((b) => !seen.has(b.id)).map((b) => ({ id: b.id, earnedOn: b.earnedOn! }));
  // Nada de novo: avança a verificação (a próxima abertura volta a ser barata).
  if (!fresh.length) await db.fitnessPrefs.update({ where: { userId }, data: { badgesSeenAt: now } });
  return fresh;
}
