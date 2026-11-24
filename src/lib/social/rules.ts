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
  // O dia de treino: sessões e atividades desse dia somadas.
  z.object({
    kind: z.literal('day'),
    date: z.string(),
    sessions: z.number().int().nonnegative(),
    activities: z.number().int().nonnegative(),
    sets: z.number().int().nonnegative(),
    volumeKg: z.number().nonnegative(),
    prs: z.number().int().nonnegative(),
    minutes: z.number().int().nonnegative(),
    names: z.array(z.string()).max(8),
  }),
  // Conquistas: emblema, nível, medalha de força e vitória no ranking semanal.
  z.object({ kind: z.literal('badge'), id: z.string(), earnedOn: z.string() }),
  z.object({ kind: z.literal('level'), level: z.number().int().positive() }),
  z.object({ kind: z.literal('tier'), exercise: z.string(), tier: z.string() }),
  z.object({ kind: z.literal('league'), league: z.string(), rank: z.number().int().min(1).max(3), weekStart: z.string(), xp: z.number().int().nonnegative() }),
]);

/** Conquistas e o dia partilhados num post (o resto são treinos: sessão ou atividade). */
export const ACHIEVEMENT_KINDS = ['badge', 'level', 'tier', 'league'] as const;

/**
 * O que se pode anexar a um post, como vem do editor: `session:<id>`, `activity:<id>`, `day:<data>`, `badge:<id>`,
 * `level`, `tier:<exercício>` ou `league:<domingo>`.
 */
export function parseAttachRef(ref: string): { kind: string; id: string } | null {
  const m = /^(session|activity|day|badge|level|tier|league)(?::(.{1,191}))?$/.exec(ref);
  if (!m) return null;
  if (m[1] !== 'level' && !m[2]) return null;
  return { kind: m[1]!, id: m[2] ?? '' };
}
export type WorkoutSnapshot = z.infer<typeof workoutSnapshotSchema>;

/** Iniciais para o avatar (sem fotos por agora): "Ana Silva" → "AS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase() || '?';
}

/** Base para um @ automático a partir do nome: "Ana Lúcia Silva" → "ana.silva"; vazio → "atleta". */
export function handleBase(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const base = (words.length > 1 ? `${words[0]}.${words[words.length - 1]}` : (words[0] ?? '')).slice(0, 16);
  const ok = handleSchema.safeParse(base);
  return ok.success ? ok.data : 'atleta';
}
