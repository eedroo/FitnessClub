import { z } from 'zod';

/** Rede social (Fase C). Puro: @, visibilidade dos posts, estado da amizade e o retrato do treino partilhado. */
const RESERVED = new Set(['admin', 'administrador', 'fitnessclub', 'fitness', 'onda', 'suporte', 'support', 'help', 'ajuda', 'moderador', 'moderator', 'staff', 'oficial', 'official', 'root', 'system', 'me', 'eu', 'feed', 'friends', 'amigos']);

/** "@Ana.Silva" → "ana.silva". */
export const normalizeHandle = (v: string) => v.trim().replace(/^@+/, '').toLowerCase();

export const handleSchema = z
  .string()
  .transform(normalizeHandle)
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9_.]{3,20}$/, 'format')
      .refine((h) => !h.startsWith('.') && !h.endsWith('.') && !h.includes('..'), 'format')
      .refine((h) => !RESERVED.has(h), 'reserved'),
  );

export const profileSchema = z.object({
  handle: handleSchema,
  displayName: z.string().trim().min(1).max(40),
  bio: z
    .string()
    .trim()
    .max(160)
    .nullable()
    .transform((v) => v || null),
});

export const postTextSchema = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => v || null);

export const commentSchema = z.string().trim().min(1).max(500);

export const reportReasonSchema = z.enum(['spam', 'harassment', 'hate', 'nudity', 'violence', 'self_harm', 'misinformation', 'other']);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export type Visibility = 'PUBLIC' | 'FRIENDS';

/** Quem vê um post: o autor, os amigos (posts de amigos) ou toda a gente com conta (públicos); nunca com bloqueio nem escondido. */
export function canSeePost(
  post: { authorId: string; visibility: Visibility; hiddenAt: Date | null },
  viewerId: string,
  ctx: { friends: Set<string>; blocked: Set<string> },
): boolean {
  if (post.authorId === viewerId) return true; // o autor vê sempre os seus (mesmo escondidos, com o aviso)
  if (post.hiddenAt) return false;
  if (ctx.blocked.has(post.authorId)) return false;
  return post.visibility === 'PUBLIC' || ctx.friends.has(post.authorId);
}

export type Relationship = 'self' | 'none' | 'outgoing' | 'incoming' | 'friends' | 'blocked';

export function relationship(
  me: string,
  other: string,
  rows: { requesterId: string; addresseeId: string; status: 'PENDING' | 'ACCEPTED' }[],
  blocked: boolean,
): Relationship {
  if (me === other) return 'self';
  if (blocked) return 'blocked';
  const r = rows.find((x) => (x.requesterId === me && x.addresseeId === other) || (x.requesterId === other && x.addresseeId === me));
  if (!r) return 'none';
  if (r.status === 'ACCEPTED') return 'friends';
  return r.requesterId === me ? 'outgoing' : 'incoming';
}

/** Retrato do treino partilhado (guardado no post: não muda se a sessão for editada depois). */
export const workoutSnapshotSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('session'),
    name: z.string().nullable(),
    date: z.string(),
    durationSec: z.number().int().nonnegative(),
    sets: z.number().int().nonnegative(),
    volumeKg: z.number().nonnegative(),
    prs: z.number().int().nonnegative(),
    exercises: z.array(z.string()).max(8),
  }),
  z.object({
    kind: z.literal('activity'),
    type: z.string(),
    date: z.string(),
    durationSec: z.number().int().nonnegative(),
    distanceMeters: z.number().int().nullable(),
    effort: z.number().int().nullable(),
  }),
]);
export type WorkoutSnapshot = z.infer<typeof workoutSnapshotSchema>;

/** Iniciais para o avatar (sem fotos por agora): "Ana Silva" → "AS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase() || '?';
}
