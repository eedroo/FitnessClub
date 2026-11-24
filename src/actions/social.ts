'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { requireFeature } from '@/lib/entitlements/server';
import { fromDbDate } from '@/lib/dates';
import { exerciseName, type ExerciseNames } from '@/lib/fitness/library';
import { dbToAppLocale } from '@/i18n/locales';
import { translatorFor } from '@/i18n/translator';
import { socialNotification } from '@/lib/notifications/content';
import { pushToUser } from '@/lib/notifications/send';
import { blockedIds, ensureProfile, friendIds } from '@/lib/social/server';
import { del } from '@vercel/blob';
import { MAX_POST_IMAGES, ownBlobUrl } from '@/lib/media/blob';
import { commentSchema, parseAttachRef, postTextSchema, profileSchema, reportReasonSchema, type WorkoutSnapshot } from '@/lib/social/rules';
import { getGamification, getStrengthLevels } from '@/lib/gamification/server';
import { isDateISO, toDbDate } from '@/lib/dates';

/**
 * Acções da rede social (Fase C). Sessão + recurso `pro` + perfil na comunidade; Zod; bloqueios verificados no
 * servidor. Limites simples por dia contra spam.
 */
type Result<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };
const fail = (error = 'common.errors.generic') => ({ ok: false as const, error });
const id = z.string().min(1).max(191);
const refresh = () => revalidatePath('/', 'layout');

async function me(): Promise<string | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  await requireFeature(s.user.id, 'pro');
  return s.user.id;
}

/** Toda a conta é um perfil (criado na hora para contas antigas). */
async function member(): Promise<{ id: string; displayName: string; handle: string } | null> {
  const uid = await me();
  if (!uid) return null;
  const p = await ensureProfile(uid);
  return { id: uid, displayName: p.displayName, handle: p.handle };
}

const since24h = () => new Date(Date.now() - 24 * 3600_000);

async function notify(userId: string, actorId: string, kind: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'LIKE' | 'COMMENT', postId: string | null, actorName: string) {
  await db.socialNotice.create({ data: { userId, actorId, kind, postId } });
  if (kind === 'LIKE') return;
  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true } });
  if (!user) return;
  const url = kind === 'COMMENT' && postId ? `/p/${postId}` : '/friends';
  await pushToUser(userId, { ...socialNotification(user.locale, kind, actorName, url), tag: `social-${kind}` }).catch(() => 0);
}

// ─── Perfil ──────────────────────────────────────────────────────────────────────────────────────

export async function saveSocialProfile(input: { handle: string; displayName: string; bio: string | null }): Promise<Result> {
  // Aberto a quem tem sessão (as boas-vindas gravam o perfil mesmo sem o recurso `pro`).
  const uid = (await auth())?.user?.id ?? null;
  if (!uid) return fail('common.errors.unauthorized');
  const p = profileSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues.some((i) => i.message === 'reserved') ? 'social.errors.handleReserved' : 'social.errors.handle');
  const taken = await db.socialProfile.findUnique({ where: { handle: p.data.handle }, select: { userId: true } });
  if (taken && taken.userId !== uid) return fail('social.errors.handleTaken');
  await db.socialProfile.upsert({ where: { userId: uid }, create: { userId: uid, ...p.data }, update: p.data });
  refresh();
  return { ok: true };
}

/** Apaga fotos do Blob (best-effort: sem token, ou se já não existirem, segue). */
async function dropBlobs(urls: string[]) {
  if (!urls.length || !process.env.BLOB_READ_WRITE_TOKEN) return;
  await del(urls).catch(() => undefined);
}

export async function setAvatar(url: string | null): Promise<Result> {
  const m = await member();
  if (!m) return fail('common.errors.unauthorized');
  if (url !== null && (typeof url !== 'string' || !ownBlobUrl(url, m.id, 'avatars'))) return fail();
  const before = await db.socialProfile.findUnique({ where: { userId: m.id }, select: { avatarUrl: true } });
  await db.socialProfile.update({ where: { userId: m.id }, data: { avatarUrl: url } });
  if (before?.avatarUrl && before.avatarUrl !== url) await dropBlobs([before.avatarUrl]);
  refresh();
  return { ok: true };
}

export async function setShareLevels(on: boolean): Promise<Result> {
  const m = await member();
  if (!m) return fail('common.errors.unauthorized');
  await db.socialProfile.update({ where: { userId: m.id }, data: { shareLevels: on === true } });
  refresh();
  return { ok: true };
}

/** Aparecer no ranking semanal por ligas (ligado por defeito); desligado, também não chegam os avisos dele. */
export async function setInRanking(on: boolean): Promise<Result> {
  const m = await member();
  if (!m) return fail('common.errors.unauthorized');
  await db.socialProfile.update({ where: { userId: m.id }, data: { inRanking: on === true } });
  refresh();
  return { ok: true };
}

// ─── Amizades e bloqueios ────────────────────────────────────────────────────────────────────────

export async function requestFriend(otherId: string): Promise<Result> {
  const m = await member();
  if (!m) return fail('social.errors.join');
  const o = id.safeParse(otherId);
  if (!o.success || o.data === m.id) return fail();
  const [other, blocked] = await Promise.all([db.socialProfile.findUnique({ where: { userId: o.data } }), blockedIds(m.id)]);
  if (!other || blocked.has(o.data)) return fail();
  if ((await db.friendship.count({ where: { requesterId: m.id, createdAt: { gte: since24h() } } })) >= 50) return fail('social.errors.limit');
  // Se a outra pessoa já me tinha pedido, aceitar.
  const reverse = await db.friendship.findUnique({ where: { requesterId_addresseeId: { requesterId: o.data, addresseeId: m.id } } });
  if (reverse) {
    if (reverse.status === 'PENDING') {
      await db.friendship.update({ where: { id: reverse.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
      await notify(o.data, m.id, 'FRIEND_ACCEPTED', null, m.displayName);
    }
  } else {
    const created = await db.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: m.id, addresseeId: o.data } },
      create: { requesterId: m.id, addresseeId: o.data },
      update: {},
    });
    if (created.status === 'PENDING') await notify(o.data, m.id, 'FRIEND_REQUEST', null, m.displayName);
  }
  refresh();
  return { ok: true };
}

export async function answerFriend(friendshipId: string, accept: boolean): Promise<Result> {
  const m = await member();
  if (!m) return fail('social.errors.join');
  const f = id.safeParse(friendshipId);
  if (!f.success) return fail();
  const row = await db.friendship.findFirst({ where: { id: f.data, addresseeId: m.id, status: 'PENDING' } });
  if (!row) return fail();
  if (accept) {
    await db.friendship.update({ where: { id: row.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
    await notify(row.requesterId, m.id, 'FRIEND_ACCEPTED', null, m.displayName);
  } else await db.friendship.delete({ where: { id: row.id } });
  refresh();
  return { ok: true };
}

/** Desfazer amizade ou cancelar um pedido (de qualquer um dos lados). */
export async function removeFriend(otherId: string): Promise<Result> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const o = id.safeParse(otherId);
  if (!o.success) return fail();
  await db.friendship.deleteMany({ where: { OR: [{ requesterId: uid, addresseeId: o.data }, { requesterId: o.data, addresseeId: uid }] } });
  refresh();
  return { ok: true };
}

export async function blockUser(otherId: string, on: boolean): Promise<Result> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const o = id.safeParse(otherId);
  if (!o.success || o.data === uid) return fail();
  if (on) {
    await db.$transaction([
      db.block.upsert({ where: { blockerId_blockedId: { blockerId: uid, blockedId: o.data } }, create: { blockerId: uid, blockedId: o.data }, update: {} }),
      db.friendship.deleteMany({ where: { OR: [{ requesterId: uid, addresseeId: o.data }, { requesterId: o.data, addresseeId: uid }] } }),
    ]);
  } else await db.block.deleteMany({ where: { blockerId: uid, blockedId: o.data } });
  refresh();
  return { ok: true };
}

export async function report(input: { target: 'POST' | 'COMMENT' | 'USER'; targetId: string; reason: string }): Promise<Result> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const p = z.object({ target: z.enum(['POST', 'COMMENT', 'USER']), targetId: id, reason: reportReasonSchema }).safeParse(input);
  if (!p.success) return fail();
  if ((await db.report.count({ where: { reporterId: uid, createdAt: { gte: since24h() } } })) >= 30) return fail('social.errors.limit');
  await db.report.create({ data: { reporterId: uid, ...p.data } });
  return { ok: true };
}

// ─── Posts, gostos e comentários ─────────────────────────────────────────────────────────────────

async function sessionSnapshot(uid: string, sessionId: string): Promise<WorkoutSnapshot | null> {
  const s = await db.fitnessSession.findFirst({
    where: { id: sessionId, userId: uid, endedAt: { not: null } },
    include: { workout: { select: { name: true } }, sets: { select: { exerciseId: true, reps: true, weightGrams: true, prKinds: true, exercise: { select: { names: true } } } } },
  });
  if (!s) return null;
  const user = await db.user.findUnique({ where: { id: uid }, select: { locale: true } });
  const locale = dbToAppLocale(user?.locale ?? 'PT_PT');
  const names = [...new Map(s.sets.map((x) => [x.exerciseId, exerciseName(x.exercise.names as ExerciseNames, locale)])).values()];
  return {
    kind: 'session',
    name: s.workout?.name ?? null,
    date: fromDbDate(s.date),
    durationSec: Math.round((s.endedAt!.getTime() - s.startedAt.getTime()) / 1000),
    sets: s.sets.length,
    volumeKg: Math.round(s.sets.reduce((n, x) => n + (x.reps ?? 0) * (x.weightGrams ?? 0), 0) / 100) / 10,
    prs: s.sets.filter((x) => x.prKinds.length > 0).length,
    exercises: names.slice(0, 8),
  };
}

async function activitySnapshot(uid: string, activityId: string): Promise<WorkoutSnapshot | null> {
  const a = await db.activity.findFirst({ where: { id: activityId, userId: uid } });
  if (!a) return null;
  return { kind: 'activity', type: a.type, date: fromDbDate(a.date), durationSec: a.durationSec, distanceMeters: a.distanceMeters, effort: a.effort };
}

/** O dia de treino (data local da pessoa): sessões e atividades desse dia somadas. */
async function daySnapshot(uid: string, date: string): Promise<WorkoutSnapshot | null> {
  if (!isDateISO(date)) return null;
  const [sessions, activities, user] = await Promise.all([
    db.fitnessSession.findMany({
      where: { userId: uid, date: toDbDate(date), endedAt: { not: null }, sets: { some: {} } },
      include: { workout: { select: { name: true } }, sets: { select: { reps: true, weightGrams: true, prKinds: true } } },
    }),
    db.activity.findMany({ where: { userId: uid, date: toDbDate(date) }, select: { type: true, durationSec: true } }),
    db.user.findUnique({ where: { id: uid }, select: { locale: true } }),
  ]);
  if (!sessions.length && !activities.length) return null;
  const sets = sessions.flatMap((s) => s.sets);
  const minutes =
    sessions.reduce((n, s) => n + Math.round((s.endedAt!.getTime() - s.startedAt.getTime()) / 60000), 0) + activities.reduce((n, a) => n + Math.floor(a.durationSec / 60), 0);
  const tf = translatorFor(user?.locale ?? 'PT_PT');
  const names = [
    ...sessions.map((s) => s.workout?.name ?? tf('fitness.sessions.free')),
    ...activities.map((a) => tf(`activities.types.${a.type}`)),
  ];
  return {
    kind: 'day',
    date,
    sessions: sessions.length,
    activities: activities.length,
    sets: sets.length,
    volumeKg: Math.round(sets.reduce((n, x) => n + (x.reps ?? 0) * (x.weightGrams ?? 0), 0) / 100) / 10,
    prs: sets.filter((x) => x.prKinds.length > 0).length,
    minutes,
    names: names.slice(0, 8),
  };
}

/** Conquista da pessoa, verificada no servidor (só se partilha o que foi mesmo ganho). */
async function achievementSnapshot(uid: string, kind: string, ref: string): Promise<WorkoutSnapshot | null> {
  if (kind === 'badge' || kind === 'level') {
    const game = await getGamification(uid);
    if (kind === 'level') return { kind: 'level', level: game.summary.level };
    const b = game.badges.find((x) => x.id === ref && x.earnedOn);
    return b ? { kind: 'badge', id: b.id, earnedOn: b.earnedOn! } : null;
  }
  if (kind === 'tier') {
    const lvl = (await getStrengthLevels(uid)).levels.find((l) => l.exerciseId === ref && l.tier);
    if (!lvl) return null;
    const [ex, user] = await Promise.all([
      db.exercise.findUnique({ where: { id: ref }, select: { names: true } }),
      db.user.findUnique({ where: { id: uid }, select: { locale: true } }),
    ]);
    return { kind: 'tier', exercise: ex ? exerciseName(ex.names as ExerciseNames, dbToAppLocale(user?.locale ?? 'PT_PT')) : ref, tier: lvl.tier! };
  }
  if (kind === 'league' && isDateISO(ref)) {
    const r = await db.leagueResult.findUnique({ where: { userId_weekStart: { userId: uid, weekStart: toDbDate(ref) } } });
    return r ? { kind: 'league', league: r.league, rank: r.rank, weekStart: ref, xp: r.xp } : null;
  }
  return null;
}

export async function createPost(input: {
  text: string;
  visibility: 'PUBLIC' | 'FRIENDS';
  sessionId?: string | null;
  activityId?: string | null;
  /** Outros anexos do editor: `day:<data>`, `badge:<id>`, `level`, `tier:<exercício>`, `league:<domingo>`. */
  attach?: string | null;
  images?: string[];
  /** Com fotos e um anexo: carrossel (a foto na capa e o anexo no slide seguinte). */
  carousel?: boolean;
}): Promise<Result<{ id: string }>> {
  const m = await member();
  if (!m) return fail('social.errors.join');
  const p = z
    .object({
      text: postTextSchema,
      visibility: z.enum(['PUBLIC', 'FRIENDS']),
      sessionId: id.nullable().optional(),
      activityId: id.nullable().optional(),
      attach: z.string().max(200).nullable().optional(),
      images: z.array(z.string().max(500)).max(MAX_POST_IMAGES).optional(),
      carousel: z.boolean().optional(),
    })
    .safeParse(input);
  if (!p.success) return fail('social.errors.post');
  const ref = p.data.attach ? parseAttachRef(p.data.attach) : null;
  if (p.data.attach && !ref) return fail('social.errors.post');
  const workout = p.data.sessionId
    ? await sessionSnapshot(m.id, p.data.sessionId)
    : p.data.activityId
      ? await activitySnapshot(m.id, p.data.activityId)
      : ref?.kind === 'day'
        ? await daySnapshot(m.id, ref.id)
        : ref
          ? await achievementSnapshot(m.id, ref.kind, ref.id)
          : null;
  if (ref && !workout) return fail('social.errors.post');
  const images = p.data.images ?? [];
  if (images.some((u) => !ownBlobUrl(u, m.id, 'posts'))) return fail('social.errors.post');
  if (!p.data.text && !workout && !images.length) return fail('social.errors.empty');
  if ((await db.post.count({ where: { authorId: m.id, createdAt: { gte: since24h() } } })) >= 20) return fail('social.errors.limit');
  const post = await db.post.create({
    data: {
      authorId: m.id,
      text: p.data.text,
      visibility: p.data.visibility,
      sessionId: workout?.kind === 'session' ? p.data.sessionId : null,
      activityId: workout?.kind === 'activity' ? p.data.activityId : null,
      workout: workout ?? undefined,
      images,
      carousel: !!p.data.carousel && images.length > 0 && !!workout,
    },
    select: { id: true },
  });
  refresh();
  return { ok: true, data: post };
}

export async function deletePost(postId: string): Promise<Result> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const p = id.safeParse(postId);
  if (!p.success) return fail();
  const post = await db.post.findFirst({ where: { id: p.data, authorId: uid }, select: { images: true } });
  if (!post) return fail();
  await db.post.delete({ where: { id: p.data } });
  await dropBlobs(post.images);
  refresh();
  return { ok: true };
}

/** Post que quem pede pode ver (para gostar ou comentar). */
async function visiblePost(uid: string, postId: string) {
  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true, visibility: true, hiddenAt: true } });
  if (!post) return null;
  if (post.authorId === uid) return post;
  if (post.hiddenAt) return null;
  const [friends, blocked] = await Promise.all([friendIds(uid), blockedIds(uid)]);
  if (blocked.has(post.authorId)) return null;
  return post.visibility === 'PUBLIC' || friends.has(post.authorId) ? post : null;
}

export async function toggleLike(postId: string): Promise<Result<{ liked: boolean }>> {
  const m = await member();
  if (!m) return fail('social.errors.join');
  const p = id.safeParse(postId);
  if (!p.success) return fail();
  const post = await visiblePost(m.id, p.data);
  if (!post) return fail();
  const key = { postId_userId: { postId: post.id, userId: m.id } };
  const had = await db.postLike.findUnique({ where: key });
  if (had) await db.postLike.delete({ where: key });
  else {
    await db.postLike.create({ data: { postId: post.id, userId: m.id } });
    if (post.authorId !== m.id) await notify(post.authorId, m.id, 'LIKE', post.id, m.displayName);
  }
  return { ok: true, data: { liked: !had } };
}

export async function addComment(postId: string, text: string): Promise<Result> {
  const m = await member();
  if (!m) return fail('social.errors.join');
  const p = z.object({ postId: id, text: commentSchema }).safeParse({ postId, text });
  if (!p.success) return fail('social.errors.comment');
  const post = await visiblePost(m.id, p.data.postId);
  if (!post) return fail();
  if ((await db.postComment.count({ where: { authorId: m.id, createdAt: { gte: since24h() } } })) >= 200) return fail('social.errors.limit');
  await db.postComment.create({ data: { postId: post.id, authorId: m.id, text: p.data.text } });
  if (post.authorId !== m.id) await notify(post.authorId, m.id, 'COMMENT', post.id, m.displayName);
  refresh();
  return { ok: true };
}

/** Apagar um comentário: o autor do comentário ou o autor do post. */
export async function deleteComment(commentId: string): Promise<Result> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const c = id.safeParse(commentId);
  if (!c.success) return fail();
  await db.postComment.deleteMany({ where: { id: c.data, OR: [{ authorId: uid }, { post: { authorId: uid } }] } });
  refresh();
  return { ok: true };
}

export async function markNoticesRead(): Promise<Result> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  await db.socialNotice.updateMany({ where: { userId: uid, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}
