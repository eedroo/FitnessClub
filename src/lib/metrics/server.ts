import 'server-only';
import { db } from '@/lib/db';
import { addDays, fromDbDate, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { activeByDay, activeUsers, type ActiveRow } from './active';

/** Métricas do admin, calculadas a pedido a partir da base de dados (só totais, dias em UTC). */
export interface AdminMetrics {
  today: DateISO;
  users: { total: number; new7: number; new30: number; premium: number };
  activity: ReturnType<typeof activeUsers> & { byDay: { day: DateISO; count: number }[] };
}

export async function getAdminMetrics(now = new Date()): Promise<AdminMetrics> {
  const today = todayInTz('UTC', now);
  const since = (days: number) => new Date(now.getTime() - days * 86_400_000);
  const [total, new7, new30, premium, activeRows] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since(7) } } }),
    db.user.count({ where: { createdAt: { gte: since(30) } } }),
    db.user.count({ where: { plan: 'PREMIUM', OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }] } }),
    db.userActiveDay.findMany({ where: { day: { gte: toDbDate(addDays(today, -29)) } }, select: { userId: true, day: true } }),
  ]);
  const rows: ActiveRow[] = activeRows.map((r) => ({ userId: r.userId, day: fromDbDate(r.day) }));
  return {
    today,
    users: { total, new7, new30, premium },
    activity: { ...activeUsers(rows, today), byDay: activeByDay(rows, today, 30) },
  };
}
