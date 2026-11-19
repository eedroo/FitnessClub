'use client';

import { useEffect } from 'react';
import { markNoticesRead } from '@/actions/social';

/** Ao abrir os avisos, marca-os como lidos (tira o número do sino). */
export function MarkNoticesRead() {
  useEffect(() => {
    void markNoticesRead();
  }, []);
  return null;
}
