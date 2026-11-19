'use client';

import { useEffect } from 'react';
import { markInsightRead } from '@/actions/ai';

/** Marca a retrospectiva como lida ao abrir (tira o ponto azul em Treinos). */
export function InsightRead({ id }: { id: string }) {
  useEffect(() => {
    void markInsightRead(id);
  }, [id]);
  return null;
}
