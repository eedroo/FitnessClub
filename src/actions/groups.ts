'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { requireFeature } from '@/lib/entitlements/server';
import { ensureProfile } from '@/lib/social/server';
import { MAX_GROUP_MEMBERS, MAX_GROUPS_PER_USER, groupSchema, inviteCode, type GroupInput } from '@/lib/social/groups';

/** Grupos (Fase C3): criar, editar, apagar, entrar (lista pública ou link), sair e tirar membros. */
type Result<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };
const fail = (error = 'common.errors.generic') => ({ ok: false as const, error });
const id = z.string().min(1).max(191);
const refresh = () => revalidatePath('/', 'layout');

async function me(): Promise<string | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  await requireFeature(s.user.id, 'pro');
  await ensureProfile(s.user.id);
  return s.user.id;
}

async function room(uid: string): Promise<boolean> {
  return (await db.groupMember.count({ where: { userId: uid } })) < MAX_GROUPS_PER_USER;
}

export async function createGroup(input: GroupInput): Promise<Result<{ id: string }>> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const p = groupSchema.safeParse(input);
  if (!p.success) return fail('groups.errors.invalid');
  if (!(await room(uid))) return fail('groups.errors.tooMany');
  if ((await db.group.count({ where: { ownerId: uid, createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } } })) >= 5) return fail('social.errors.limit');
  const group = await db.group.create({
    data: { ...p.data, ownerId: uid, code: inviteCode(), members: { create: { userId: uid } } },
    select: { id: true },
  });
  refresh();
  return { ok: true, data: group };
}

export async function updateGroup(groupId: string, input: GroupInput): Promise<Result> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const g = id.safeParse(groupId);
  const p = groupSchema.safeParse(input);
  if (!g.success || !p.success) return fail('groups.errors.invalid');
  const { count } = await db.group.updateMany({ where: { id: g.data, ownerId: uid }, data: p.data });
  if (!count) return fail();
  refresh();
  return { ok: true };
}

export async function deleteGroup(groupId: string): Promise<Result> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const g = id.safeParse(groupId);
  if (!g.success) return fail();
  await db.group.deleteMany({ where: { id: g.data, ownerId: uid } });
  refresh();
  return { ok: true };
}

/** Entrar: num grupo público pelo id, ou em qualquer grupo pelo código do link. */
export async function joinGroup(input: { groupId?: string; code?: string }): Promise<Result<{ id: string }>> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const p = z.object({ groupId: id.optional(), code: z.string().regex(/^[a-z0-9]{10}$/).optional() }).safeParse(input);
  if (!p.success || (!p.data.groupId && !p.data.code)) return fail();
  const group = p.data.code
    ? await db.group.findUnique({ where: { code: p.data.code }, select: { id: true, _count: { select: { members: true } } } })
    : await db.group.findFirst({ where: { id: p.data.groupId, isPublic: true }, select: { id: true, _count: { select: { members: true } } } });
  if (!group) return fail('groups.errors.notFound');
  const already = await db.groupMember.findUnique({ where: { groupId_userId: { groupId: group.id, userId: uid } } });
  if (!already) {
    if (group._count.members >= MAX_GROUP_MEMBERS) return fail('groups.errors.full');
    if (!(await room(uid))) return fail('groups.errors.tooMany');
    await db.groupMember.create({ data: { groupId: group.id, userId: uid } });
  }
  refresh();
  return { ok: true, data: { id: group.id } };
}

/** Sair (o dono não sai: apaga o grupo). */
export async function leaveGroup(groupId: string): Promise<Result> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const g = id.safeParse(groupId);
  if (!g.success) return fail();
  const group = await db.group.findUnique({ where: { id: g.data }, select: { ownerId: true } });
  if (!group || group.ownerId === uid) return fail();
  await db.groupMember.deleteMany({ where: { groupId: g.data, userId: uid } });
  refresh();
  return { ok: true };
}

export async function removeMember(groupId: string, userId: string): Promise<Result> {
  const uid = await me();
  if (!uid) return fail('common.errors.unauthorized');
  const g = id.safeParse(groupId);
  const u = id.safeParse(userId);
  if (!g.success || !u.success || u.data === uid) return fail();
  const group = await db.group.findFirst({ where: { id: g.data, ownerId: uid }, select: { id: true } });
  if (!group) return fail();
  await db.groupMember.deleteMany({ where: { groupId: g.data, userId: u.data } });
  refresh();
  return { ok: true };
}
