'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * Enquanto a IA trabalha (job no Inngest), relê a página de 3 em 3 s, até 4 minutos; passados 40 s avisa que está a
 * demorar e que se pode sair (chega uma notificação quando estiver pronto). Aos 3 min sem resposta, o servidor marca
 * o pedido como falhado e a página mostra "Pedir outro".
 */
export function AiPendingRefresh() {
  const t = useTranslations('ai.program');
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed > 40_000) setSlow(true);
      if (elapsed > 240_000) return window.clearInterval(id);
      router.refresh();
    }, 3000);
    return () => window.clearInterval(id);
  }, [router]);
  return slow ? <p className="mg-ai-wait__text">{t('slow')}</p> : null;
}
