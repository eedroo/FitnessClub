'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { requireFeature } from '@/lib/entitlements/server';
import { appUrl } from '@/lib/env';
import { addDays, compareDates, localDateTimeUtc, todayInTz } from '@/lib/dates';
import { socialNotification } from '@/lib/notifications/content';
import { pushToUser } from '@/lib/notifications/send';
import { blockedIds, ensureProfile, friendIds } from '@/lib/social/server';
import { inviteSchema, roundCoord, type InviteInput, type Place } from '@/lib/social/invites';

/** Convites de treino (Fase C4): criar, cancelar, pedir para ir, responder e decidir pedidos; pesquisa de locais. */
type Result<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };
const fail = (error = 'common.errors.generic') => ({ ok: false as const, error });
const id = z.string().min(1).max(191);
const refresh = () => revalidatePath('/', 'layout');

async function me(): Promise<{ id: string; name: string } | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  await requireFeature(s.user.id, 'pro');
  const p = await ensureProfile(s.user.id);
  return { id: s.user.id, name: p.displayName };
}

async function notify(userId: string, actorId: string, kind: 'INVITE' | 'INVITE_REQUEST' | 'INVITE_ACCEPTED', inviteId: string, actorName: string) {
  await db.socialNotice.create({ data: { userId, actorId, kind, inviteId } });
  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true } });
  if (user) await pushToUser(userId, { ...socialNotification(user.locale, kind, actorName, `/invites/${inviteId}`), tag: `invite-${inviteId}` }).catch(() => 0);
}

/**
 * Pesquisa de locais no OpenStreetMap (Nominatim): só o texto escrito sai (nunca dados da pessoa). Limitado a
 * 6 resultados; o browser só pesquisa quando a pessoa carrega em "Procurar" (política de uso do Nominatim).
 */
export async function searchPlaces(q: string): Promise<Result<Place[]>> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const query = z.string().trim().min(3).max(120).safeParse(q);
  if (!query.success) return fail('invites.errors.search');
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=0&q=${encodeURIComponent(query.data)}`;
    const res = await fetch(url, { headers: { 'User-Agent': `FitnessClub/1.0 (+${appUrl()})`, 'Accept-Language': 'pt,en' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return fail('invites.errors.search');
    const rows = (await res.json()) as { display_name: string; name?: string; lat: string; lon: string }[];
    return {
      ok: true,
      data: rows.map((r) => ({
        name: (r.name ? `${r.name} · ${r.display_name.split(',').slice(1, 3).join(',').trim()}` : r.display_name).slice(0, 120),
        lat: roundCoord(Number(r.lat)),
        lng: roundCoord(Number(r.lon)),
      })),
    };
  } catch {
    return fail('invites.errors.search');
  }
}

export async function createInvite(input: InviteInput): Promise<Result<{ id: string }>> {
  const m = await me();
  if (!m) return fail('common.errors.unauthorized');
  const p = inviteSchema.safeParse(input);
  if (!p.success) return fail('invites.errors.invalid');
  const user = await db.user.findUnique({ where: { id: m.id }, select: { timezone: true } });
  const tz = user?.timezone ?? 'Europe/Lisbon';
  const today = todayInTz(tz);
  if (compareDates(p.data.date, today) < 0 || compareDates(p.data.date, addDays(today, 60)) > 0) return fail('invites.errors.date');
  const startsAt = localDateTimeUtc(p.data.date, p.data.time, tz);
  if (startsAt.getTime() < Date.now() - 5 * 60_000) return fail('invites.errors.date');
  if ((await db.workoutInvite.count({ where: { hostId: m.id, createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } } })) >= 10) return fail('social.errors.limit');
  // Só se convidam amigos (e nunca quem está bloqueado).
  const friends = await friendIds(m.id);
  const invitees = [...new Set(p.data.invitees)].filter((u) => friends.has(u));
  const invite = await db.workoutInvite.create({
    data: {
      hostId: m.id,
      title: p.data.title,
      description: p.data.description,
      activityType: p.data.activityType,
      startsAt,
      durationMin: p.data.durationMin,
      placeName: p.data.place.name,
      placeLat: p.data.place.lat,
      placeLng: p.data.place.lng,
      visibility: p.data.visibility,
      maxPeople: p.data.maxPeople,
      guests: { create: invitees.map((userId) => ({ userId, status: 'INVITED' as const })) },
    },
    select: { id: true },
  });
  for (const u of invitees) await notify(u, m.id, 'INVITE', invite.id, m.name);
  refresh();
  return { ok: true, data: invite };
}

export async function cancelInvite(inviteId: string): Promise<Result> {
  const m = await me();
  if (!m) return fail('common.errors.unauthorized');
  const i = id.safeParse(inviteId);
  if (!i.success) return fail();
  await db.workoutInvite.updateMany({ where: { id: i.data, hostId: m.id }, data: { canceledAt: new Date() } });
  refresh();
  return { ok: true };
}

async function full(inviteId: string, max: number | null): Promise<boolean> {
  if (!max) return false;
  return 1 + (await db.inviteGuest.count({ where: { inviteId, status: 'GOING' } })) >= max;
}

/** "Quero ir": pedido ao anfitrião (convites públicos ou de amigos). */
export async function askToJoin(inviteId: string): Promise<Result> {
  const m = await me();
  if (!m) return fail('common.errors.unauthorized');
  const i = id.safeParse(inviteId);
  if (!i.success) return fail();
  const inv = await db.workoutInvite.findUnique({ where: { id: i.data }, select: { id: true, hostId: true, visibility: true, canceledAt: true, maxPeople: true, startsAt: true } });
  if (!inv || inv.canceledAt || inv.hostId === m.id || inv.startsAt.getTime() < Date.now()) return fail();
  const [friends, blocked] = await Promise.all([friendIds(m.id), blockedIds(m.id)]);
  if (blocked.has(inv.hostId) || inv.visibility === 'DIRECT' || (inv.visibility === 'FRIENDS' && !friends.has(inv.hostId))) return fail();
  if (await full(inv.id, inv.maxPeople)) return fail('invites.errors.full');
  const existing = await db.inviteGuest.findUnique({ where: { inviteId_userId: { inviteId: inv.id, userId: m.id } } });
  if (existing?.status === 'GOING' || existing?.status === 'REQUESTED') return { ok: true };
  if (existing?.status === 'INVITED') {
    await db.inviteGuest.update({ where: { inviteId_userId: { inviteId: inv.id, userId: m.id } }, data: { status: 'GOING' } });
    await notify(inv.hostId, m.id, 'INVITE_ACCEPTED', inv.id, m.name);
  } else {
    await db.inviteGuest.upsert({
      where: { inviteId_userId: { inviteId: inv.id, userId: m.id } },
      create: { inviteId: inv.id, userId: m.id, status: 'REQUESTED' },
      update: { status: 'REQUESTED' },
    });
    await notify(inv.hostId, m.id, 'INVITE_REQUEST', inv.id, m.name);
  }
  refresh();
  return { ok: true };
}

/** Responder a um convite directo. */
export async function answerInvite(inviteId: string, going: boolean): Promise<Result> {
  const m = await me();
  if (!m) return fail('common.errors.unauthorized');
  const i = id.safeParse(inviteId);
  if (!i.success) return fail();
  const inv = await db.workoutInvite.findUnique({ where: { id: i.data }, select: { id: true, hostId: true, maxPeople: true, canceledAt: true } });
  const g = inv && (await db.inviteGuest.findUnique({ where: { inviteId_userId: { inviteId: inv.id, userId: m.id } } }));
  if (!inv || !g || inv.canceledAt) return fail();
  if (going && g.status !== 'GOING' && (await full(inv.id, inv.maxPeople))) return fail('invites.errors.full');
  await db.inviteGuest.update({ where: { inviteId_userId: { inviteId: inv.id, userId: m.id } }, data: { status: going ? 'GOING' : 'DECLINED' } });
  if (going) await notify(inv.hostId, m.id, 'INVITE_ACCEPTED', inv.id, m.name);
  refresh();
  return { ok: true };
}

/** O anfitrião aceita ou recusa um pedido para ir. */
export async function decideRequest(inviteId: string, userId: string, accept: boolean): Promise<Result> {
  const m = await me();
  if (!m) return fail('common.errors.unauthorized');
  const i = id.safeParse(inviteId);
  const u = id.safeParse(userId);
  if (!i.success || !u.success) return fail();
  const inv = await db.workoutInvite.findFirst({ where: { id: i.data, hostId: m.id }, select: { id: true, maxPeople: true } });
  if (!inv) return fail();
  if (accept && (await full(inv.id, inv.maxPeople))) return fail('invites.errors.full');
  const { count } = await db.inviteGuest.updateMany({ where: { inviteId: inv.id, userId: u.data, status: 'REQUESTED' }, data: { status: accept ? 'GOING' : 'DECLINED' } });
  if (count && accept) await notify(u.data, m.id, 'INVITE_ACCEPTED', inv.id, m.name);
  refresh();
  return { ok: true };
}

/** Deixar de ir (ou retirar o pedido). */
export async function leaveInvite(inviteId: string): Promise<Result> {
  const m = await me();
  if (!m) return fail('common.errors.unauthorized');
  const i = id.safeParse(inviteId);
  if (!i.success) return fail();
  await db.inviteGuest.updateMany({ where: { inviteId: i.data, userId: m.id }, data: { status: 'DECLINED' } });
  refresh();
  return { ok: true };
}
