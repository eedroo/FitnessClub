'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Enquanto a IA trabalha (job no Inngest), relê a página de 3 em 3 s, até 3 minutos. */
export function AiPendingRefresh() {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      if (Date.now() - started > 180_000) return window.clearInterval(id);
      router.refresh();
    }, 3000);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
