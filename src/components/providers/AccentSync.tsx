'use client';

import { useEffect } from 'react';
import { ACCENT_COOKIE, ACCENT_COOKIE_MAX_AGE, type Accent } from '@/lib/accent';

/** Aplica a cor de destaque da conta (ex.: escolhida noutro dispositivo) e guarda-a no cookie. */
export function AccentSync({ accent }: { accent: Accent }) {
  useEffect(() => {
    if (document.documentElement.dataset.accent === accent) return;
    document.documentElement.dataset.accent = accent;
    document.cookie = `${ACCENT_COOKIE}=${accent}; max-age=${ACCENT_COOKIE_MAX_AGE}; path=/; samesite=lax`;
  }, [accent]);
  return null;
}
