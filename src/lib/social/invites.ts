import { z } from 'zod';
import { isActivityType } from '@/lib/activities/types';

/**
 * Convites de treino (Fase C4). Puro: validação, arredondamento do local, quem vê e distâncias. O local é sempre um
 * sítio escolhido numa pesquisa (academia, parque, bairro), arredondado a ~100 m; nunca a posição de ninguém.
 */
export const roundCoord = (v: number) => Math.round(v * 1000) / 1000;

export const placeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  lat: z.number().min(-90).max(90).transform(roundCoord),
  lng: z.number().min(-180).max(180).transform(roundCoord),
});
export type Place = z.infer<typeof placeSchema>;

export const inviteSchema = z.object({
  title: z.string().trim().min(2).max(60),
  description: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .transform((v) => v || null),
  activityType: z.string().refine(isActivityType),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMin: z.number().int().min(10).max(600).nullable(),
  place: placeSchema,
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'DIRECT']),
  maxPeople: z.number().int().min(2).max(100).nullable(),
  invitees: z.array(z.string().min(1).max(191)).max(50),
});
export type InviteInput = z.input<typeof inviteSchema>;

/** Quem vê um convite: o anfitrião, quem está na lista, os amigos (FRIENDS) ou toda a gente (PUBLIC); nunca com bloqueio. */
export function canSeeInvite(
  inv: { hostId: string; visibility: 'PUBLIC' | 'FRIENDS' | 'DIRECT'; canceledAt: Date | null },
  viewerId: string,
  ctx: { friends: Set<string>; blocked: Set<string>; guest: boolean },
): boolean {
  if (inv.hostId === viewerId || ctx.guest) return true;
  if (inv.canceledAt || ctx.blocked.has(inv.hostId)) return false;
  if (inv.visibility === 'PUBLIC') return true;
  if (inv.visibility === 'FRIENDS') return ctx.friends.has(inv.hostId);
  return false;
}

/** Distância em km entre dois pontos (para ordenar "perto de mim" no próprio telemóvel). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
