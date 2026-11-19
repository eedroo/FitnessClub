/** Cores de destaque à escolha (tokens em `src/styles/tokens.css`, `[data-accent]`). Sem estado; serve servidor e cliente. */
export const ACCENTS = ['orange', 'blue', 'pink', 'violet', 'green', 'graphite'] as const;
export type Accent = (typeof ACCENTS)[number];
export const DEFAULT_ACCENT: Accent = 'orange';

/** Cookie com a cor de destaque: o <html> já sai com ela do servidor (sem piscar). */
export const ACCENT_COOKIE = 'fc_accent';
export const ACCENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isAccent(v: unknown): v is Accent {
  return typeof v === 'string' && (ACCENTS as readonly string[]).includes(v);
}

export function accentOrDefault(v: unknown): Accent {
  return isAccent(v) ? v : DEFAULT_ACCENT;
}
