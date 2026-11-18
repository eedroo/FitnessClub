import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sparkles, PersonStanding, Dumbbell, Droplet, Heart, CalendarDays, Scale, Flame, Star, Bell, Trophy } from 'lucide-react';

export type MagicIconKind = '3d' | 'glyph';

export const MAGIC_ICON_NAMES = [
  // Marca e destaques
  'dumbbell', 'sparkles', 'trophy', 'flame', 'star',
  // Corpo
  'stretch', 'water-drop', 'scale', 'heart', 'calendar',
  // Notificações (o sino do cartão e o badge monocromático do push, 96×96)
  'bell', 'notification-badge',
] as const;
export type MagicIconName = (typeof MAGIC_ICON_NAMES)[number];

export type MagicIconFallback = LucideIcon | ComponentType<{ className?: string }>;

export interface MagicIconDef {
  kind: MagicIconKind;
  ready: boolean; // true quando public/icons/magic/<name>.png existir
  fallback: MagicIconFallback; // placeholder enquanto ready = false
}

/** Nome do componente de fallback (documentação). */
export function fallbackName(def: MagicIconDef): string {
  const c = def.fallback as { displayName?: string; name?: string };
  return c.displayName ?? c.name ?? 'Unknown';
}

const icon = (fallback: MagicIconFallback): MagicIconDef => ({ kind: '3d', ready: false, fallback });

export const MAGIC_ICONS: Record<MagicIconName, MagicIconDef> = {
  dumbbell: icon(Dumbbell),
  sparkles: icon(Sparkles),
  trophy: icon(Trophy),
  flame: icon(Flame),
  star: icon(Star),
  stretch: icon(PersonStanding),
  'water-drop': icon(Droplet),
  scale: icon(Scale),
  heart: icon(Heart),
  calendar: icon(CalendarDays),
  bell: icon(Bell),
  'notification-badge': icon(Bell),
};

/** Imagem do badge das notificações push: o PNG quando existir, senão o ícone do app. */
export function notificationBadgeUrl(): string {
  return MAGIC_ICONS['notification-badge'].ready ? '/icons/magic/notification-badge.png' : '/icons/icon-192.png';
}
