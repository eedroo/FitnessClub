import 'server-only';
import { db } from '@/lib/db';
import { blockedIds, friendIds } from './server';
import { canSeeInvite } from './invites';

/** Leitura dos convites de treino (Fase C4), sempre filtrada por quem vê. */
const INCLUDE = {
  host: { select: { id: true, socialProfile: { select: { handle: true, displayName: true, avatarUrl: true } } } },
  guests: { select: { userId: true, status: true } },
} as const;

export interface InviteView {
  id: string;
  title: string;
  description: string | null;
  activityType: string;
  startsAt: string;
  durationMin: number | null;
  place: { name: string; lat: number; lng: number };
  visibility: 'PUBLIC' | 'FRIENDS' | 'DIRECT';
  maxPeople: number | null;
  canceled: boolean;
  host: { id: string; handle: string; displayName: string; avatarUrl: string | null };
  going: number; // inclui o anfitrião
  mine: boolean;
  myStatus: 'INVITED' | 'REQUESTED' | 'GOING' | 'DECLINED' | null;
}

type Row = Awaited<ReturnType<typeof db.workoutInvite.findFirstOrThrow<{ include: typeof INCLUDE }>>>;

function toView(r: Row, viewerId: string): InviteView | null {
  const h = r.host.socialProfile;
  if (!h) return null;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    activityType: r.activityType,
    startsAt: r.startsAt.toISOString(),
    durationMin: r.durationMin,
    place: { name: r.placeName, lat: r.placeLat, lng: r.placeLng },
    visibility: r.visibility,
    maxPeople: r.maxPeople,
    canceled: !!r.canceledAt,
    host: { id: r.host.id, ...h },
    going: 1 + r.guests.filter((g) => g.status === 'GOING').length,
    mine: r.hostId === viewerId,
    myStatus: r.guests.find((g) => g.userId === viewerId)?.status ?? null,
  };
}

/** Próximos treinos (das últimas 2 h aos próximos 60 dias) que quem vê pode ver. */
export async function listInvites(viewerId: string): Promise<InviteView[]> {
  const [friends, blocked] = await Promise.all([friendIds(viewerId), blockedIds(viewerId)]);
  const now = Date.now();
  const rows = await db.workoutInvite.findMany({
    where: {
      startsAt: { gte: new Date(now - 2 * 3600_000), lte: new Date(now + 60 * 86400_000) },
      hostId: { notIn: [...blocked] },
      OR: [
        { hostId: viewerId },
        { guests: { some: { userId: viewerId } } },
        { visibility: 'PUBLIC', canceledAt: null },
        { visibility: 'FRIENDS', canceledAt: null, hostId: { in: [...friends] } },
      ],
    },
    orderBy: { startsAt: 'asc' },
    take: 100,
    include: INCLUDE,
  });
  return rows
    .filter((r) => canSeeInvite(r, viewerId, { friends, blocked, guest: r.guests.some((g) => g.userId === viewerId) }))
    .map((r) => toView(r, viewerId))
    .filter((v): v is InviteView => !!v);
}

export async function getInvite(viewerId: string, id: string) {
  const [friends, blocked] = await Promise.all([friendIds(viewerId), blockedIds(viewerId)]);
  const row = await db.workoutInvite.findUnique({ where: { id }, include: INCLUDE });
  if (!row || !canSeeInvite(row, viewerId, { friends, blocked, guest: row.guests.some((g) => g.userId === viewerId) })) return null;
  const view = toView(row, viewerId);
  if (!view) return null;
  // Lista de pessoas: quem vai (todos vêem); pedidos e convites pendentes só o anfitrião.
  const ids = row.guests.filter((g) => g.status === 'GOING' || view.mine).map((g) => g.userId);
  const profiles = await db.socialProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, handle: true, displayName: true, avatarUrl: true } });
  const P = new Map(profiles.map((p) => [p.userId, p]));
  const people = row.guests
    .filter((g) => P.has(g.userId) && !blocked.has(g.userId))
    .filter((g) => g.status === 'GOING' || view.mine)
    .map((g) => ({ ...P.get(g.userId)!, status: g.status }));
  return { invite: view, people };
}
