import 'server-only';
import { db } from '@/lib/db';
import { fromDbDate, localTimeOf, toDbDate, type DateISO } from '@/lib/dates';
import { isActivityType, type ActivityType } from './types';

export interface ActivityListItem {
  id: string;
  type: ActivityType;
  date: DateISO;
  startedAt: string;
  durationSec: number;
  effort: number | null;
  distanceMeters: number | null;
}

const SELECT = { id: true, type: true, date: true, startedAt: true, durationSec: true, effort: true, distanceMeters: true } as const;
type Row = { id: string; type: string; date: Date; startedAt: Date; durationSec: number; effort: number | null; distanceMeters: number | null };
const toItem = (r: Row): ActivityListItem => ({
  id: r.id,
  type: isActivityType(r.type) ? r.type : 'other',
  date: fromDbDate(r.date),
  startedAt: r.startedAt.toISOString(),
  durationSec: r.durationSec,
  effort: r.effort,
  distanceMeters: r.distanceMeters,
});

export async function listActivities(userId: string, take = 200): Promise<ActivityListItem[]> {
  const rows = await db.activity.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take, select: SELECT });
  return rows.map(toItem);
}

export async function activitiesOn(userId: string, date: DateISO): Promise<ActivityListItem[]> {
  const rows = await db.activity.findMany({ where: { userId, date: toDbDate(date) }, orderBy: { startedAt: 'asc' }, select: SELECT });
  return rows.map(toItem);
}

/** Para editar: os valores do formulário (hora no fuso da pessoa). */
export async function getActivityForm(userId: string, id: string, tz: string) {
  const r = await db.activity.findFirst({ where: { id, userId } });
  if (!r) return null;
  return {
    id: r.id,
    type: isActivityType(r.type) ? r.type : ('other' as ActivityType),
    date: fromDbDate(r.date),
    time: localTimeOf(r.startedAt, tz),
    durationMin: Math.round(r.durationSec / 60),
    effort: r.effort,
    distanceKm: r.distanceMeters != null ? String(r.distanceMeters / 1000) : '',
    notes: r.notes ?? '',
  };
}
