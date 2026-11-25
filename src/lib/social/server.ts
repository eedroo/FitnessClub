import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { hiddenBotIds } from '@/lib/bots/server';
import { handleBase, workoutSnapshotSchema, type Visibility, type WorkoutSnapshot } from './rules';

/** Leitura da rede social (Fase C). Toda a filtragem por amizade, bloqueio e moderação acontece aqui, no servidor. */

export async function getMyProfile(userId: string) {
  return db.socialProfile.findUnique({ where: { userId } });
}

/** Um @ livre a partir do nome: "ana.silva", senão "ana.silva" + 2–4 algarismos. */
export async function freeHandle(name: string): Promise<string> {
  const base = handleBase(name);
  if (!(await db.socialProfile.findUnique({ where: { handle: base }, select: { userId: true } }))) return base;
  for (let i = 0; i < 20; i++) {
    const h = `${base.slice(0, 15)}${Math.floor(10 + Math.random() * (i < 10 ? 90 : 9990))}`;
    if (!(await db.socialProfile.findUnique({ where: { handle: h }, select: { userId: true } }))) return h;
  }
  return `${base.slice(0, 12)}${Date.now().toString(36).slice(-6)}`;
}

/** Toda a conta é um perfil: quem ainda não tem (contas antigas) recebe um @ automático, que pode mudar no "Eu". */
export async function ensureProfile(userId: string) {
  const existing = await db.socialProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  const name = user?.name?.trim() || 'Atleta';
  try {
    return await db.socialProfile.create({ data: { userId, handle: await freeHandle(name), displayName: name.slice(0, 40) } });
  } catch {
    // corrida com outro pedido: lê o que ficou
    return (await db.socialProfile.findUnique({ where: { userId } }))!;
  }
}

export async function friendIds(userId: string): Promise<Set<string>> {
  const rows = await db.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return new Set(rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId)));
}

/**
 * Bloqueados nos dois sentidos (quem bloqueei e quem me bloqueou). Com os bots ocultos no admin, eles também entram
 * aqui: somem do feed, dos perfis, da pesquisa, dos comentários e do ranking de uma vez.
 */
export async function blockedIds(userId: string): Promise<Set<string>> {
  const [rows, bots] = await Promise.all([
    db.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] }, select: { blockerId: true, blockedId: true } }),
    hiddenBotIds(),
  ]);
  return new Set([...rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)), ...bots]);
}

export interface PostView {
  id: string;
  author: { id: string; handle: string; displayName: string; avatarUrl: string | null; isBot: boolean };
  text: string | null;
  images: string[];
  /** Fotos e anexo em carrossel (capa = foto, a seguir o anexo editorial). */
  carousel: boolean;
  visibility: Visibility;
  workout: WorkoutSnapshot | null;
  createdAt: string;
  likes: number;
  liked: boolean;
  comments: number;
  mine: boolean;
  hidden: boolean;
}

const POST_INCLUDE = {
  author: { select: { id: true, isBot: true, socialProfile: { select: { handle: true, displayName: true, avatarUrl: true } } } },
  _count: { select: { likes: true, comments: { where: { hiddenAt: null } } } },
} satisfies Prisma.PostInclude;

type PostRow = Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }>;

function toView(p: PostRow, viewerId: string, liked: Set<string>): PostView | null {
  const prof = p.author.socialProfile;
  if (!prof) return null;
  const w = p.workout ? workoutSnapshotSchema.safeParse(p.workout) : null;
  return {
    id: p.id,
    author: { id: p.author.id, handle: prof.handle, displayName: prof.displayName, avatarUrl: prof.avatarUrl, isBot: p.author.isBot },
    text: p.text,
    images: p.images,
    carousel: p.carousel && p.images.length > 0 && !!(w?.success && w.data),
    visibility: p.visibility,
    workout: w?.success ? w.data : null,
    createdAt: p.createdAt.toISOString(),
    likes: p._count.likes,
    liked: liked.has(p.id),
    comments: p._count.comments,
    mine: p.authorId === viewerId,
    hidden: !!p.hiddenAt,
  };
}

async function likedBy(viewerId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const rows = await db.postLike.findMany({ where: { userId: viewerId, postId: { in: ids } }, select: { postId: true } });
  return new Set(rows.map((r) => r.postId));
}

/** Feed: os meus, os dos amigos e os públicos de quem tem perfil; sem bloqueados nem escondidos. Mais recentes primeiro. */
export async function getFeed(viewerId: string, opts: { before?: Date; take?: number; scope?: 'all' | 'friends' } = {}): Promise<PostView[]> {
  const [friends, blocked] = await Promise.all([friendIds(viewerId), blockedIds(viewerId)]);
  const take = opts.take ?? 30;
  const friendList = [...friends];
  const rows = await db.post.findMany({
    where: {
      ...(opts.before && { createdAt: { lt: opts.before } }),
      authorId: { notIn: [...blocked] },
      OR: [
        { authorId: viewerId },
        { authorId: { in: friendList }, hiddenAt: null },
        ...(opts.scope === 'friends' ? [] : [{ visibility: 'PUBLIC' as const, hiddenAt: null }]),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take,
    include: POST_INCLUDE,
  });
  const liked = await likedBy(viewerId, rows.map((r) => r.id));
  return rows.map((r) => toView(r, viewerId, liked)).filter((p): p is PostView => !!p);
}

/** Posts de uma pessoa que quem vê pode ver. */
export async function getPostsBy(viewerId: string, authorId: string, take = 30): Promise<PostView[]> {
  const [friends, blocked] = await Promise.all([friendIds(viewerId), blockedIds(viewerId)]);
  if (blocked.has(authorId)) return [];
  const own = authorId === viewerId;
  const rows = await db.post.findMany({
    where: { authorId, ...(own ? {} : { hiddenAt: null, ...(friends.has(authorId) ? {} : { visibility: 'PUBLIC' as const }) }) },
    orderBy: { createdAt: 'desc' },
    take,
    include: POST_INCLUDE,
  });
  const liked = await likedBy(viewerId, rows.map((r) => r.id));
  return rows.map((r) => toView(r, viewerId, liked)).filter((p): p is PostView => !!p);
}

export interface CommentView {
  id: string;
  author: { id: string; handle: string; displayName: string; avatarUrl: string | null };
  text: string;
  createdAt: string;
  mine: boolean;
}

/** Um post (se quem vê o pode ver) com os comentários visíveis. */
export async function getPost(viewerId: string, id: string): Promise<{ post: PostView; comments: CommentView[] } | null> {
  const [friends, blocked] = await Promise.all([friendIds(viewerId), blockedIds(viewerId)]);
  const row = await db.post.findUnique({ where: { id }, include: POST_INCLUDE });
  if (!row) return null;
  const visible =
    row.authorId === viewerId || (!row.hiddenAt && !blocked.has(row.authorId) && (row.visibility === 'PUBLIC' || friends.has(row.authorId)));
  if (!visible) return null;
  const post = toView(row, viewerId, await likedBy(viewerId, [row.id]));
  if (!post) return null;
  const comments = await db.postComment.findMany({
    where: { postId: id, hiddenAt: null, authorId: { notIn: [...blocked] } },
    orderBy: { createdAt: 'asc' },
    take: 200,
    include: { author: { select: { id: true, socialProfile: { select: { handle: true, displayName: true, avatarUrl: true } } } } },
  });
  return {
    post,
    comments: comments
      .filter((c) => c.author.socialProfile)
      .map((c) => ({
        id: c.id,
        author: { id: c.author.id, handle: c.author.socialProfile!.handle, displayName: c.author.socialProfile!.displayName, avatarUrl: c.author.socialProfile!.avatarUrl },
        text: c.text,
        createdAt: c.createdAt.toISOString(),
        mine: c.authorId === viewerId,
      })),
  };
}

/** Perfil por @ (null se não existe ou há bloqueio), com a relação e a contagem de amigos. */
export async function getProfileByHandle(viewerId: string, handle: string) {
  const prof = await db.socialProfile.findUnique({ where: { handle } });
  if (!prof) return null;
  const blocked = await blockedIds(viewerId);
  const iBlocked = await db.block.findUnique({ where: { blockerId_blockedId: { blockerId: viewerId, blockedId: prof.userId } } });
  if (blocked.has(prof.userId) && !iBlocked) return null; // bloquearam-me: o perfil "não existe"
  const [rows, friends] = await Promise.all([
    db.friendship.findMany({
      where: { OR: [{ requesterId: viewerId, addresseeId: prof.userId }, { requesterId: prof.userId, addresseeId: viewerId }] },
      select: { id: true, requesterId: true, addresseeId: true, status: true },
    }),
    friendIds(prof.userId),
  ]);
  return { profile: prof, rows, friendsCount: friends.size, iBlocked: !!iBlocked };
}

export async function searchProfiles(viewerId: string, q: string) {
  const term = q.trim().replace(/^@/, '').toLowerCase();
  if (term.length < 2) return [];
  const blocked = await blockedIds(viewerId);
  return db.socialProfile.findMany({
    where: {
      userId: { notIn: [viewerId, ...blocked] },
      OR: [{ handle: { startsWith: term } }, { displayName: { contains: term, mode: 'insensitive' } }],
    },
    take: 20,
    orderBy: { handle: 'asc' },
    select: { userId: true, handle: true, displayName: true, avatarUrl: true },
  });
}

export async function getFriendsPage(userId: string) {
  const blocked = await blockedIds(userId);
  const rows = await db.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { id: true, socialProfile: { select: { handle: true, displayName: true, avatarUrl: true } } } },
      addressee: { select: { id: true, socialProfile: { select: { handle: true, displayName: true, avatarUrl: true } } } },
    },
  });
  const other = (r: (typeof rows)[number]) => (r.requesterId === userId ? r.addressee : r.requester);
  const view = (r: (typeof rows)[number]) => {
    const o = other(r);
    return o.socialProfile && !blocked.has(o.id) ? { id: r.id, userId: o.id, handle: o.socialProfile.handle, displayName: o.socialProfile.displayName, avatarUrl: o.socialProfile.avatarUrl } : null;
  };
  const clean = <T,>(v: (T | null)[]) => v.filter((x): x is T => !!x);
  return {
    incoming: clean(rows.filter((r) => r.status === 'PENDING' && r.addresseeId === userId).map(view)),
    outgoing: clean(rows.filter((r) => r.status === 'PENDING' && r.requesterId === userId).map(view)),
    friends: clean(rows.filter((r) => r.status === 'ACCEPTED').map(view)),
  };
}

export async function unreadNotices(userId: string): Promise<number> {
  return db.socialNotice.count({ where: { userId, readAt: null } });
}

export async function getNotices(userId: string) {
  const blocked = await blockedIds(userId);
  const rows = await db.socialNotice.findMany({
    where: { userId, actorId: { notIn: [...blocked] } },
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: { actor: { select: { socialProfile: { select: { handle: true, displayName: true, avatarUrl: true } } } } },
  });
  return rows
    .filter((r) => r.actor.socialProfile)
    .map((r) => ({ id: r.id, kind: r.kind, postId: r.postId, inviteId: r.inviteId, read: !!r.readAt, createdAt: r.createdAt.toISOString(), actor: r.actor.socialProfile! }));
}
