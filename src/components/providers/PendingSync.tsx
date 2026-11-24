'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pendingSessionIds, syncSession } from '@/components/body/sessionQueue';

/**
 * Em qualquer página da app: ao abrir e quando a rede volta, envia o que ficou no dispositivo de treinos feitos sem
 * rede (séries e o fim do treino), mesmo que a pessoa não volte ao ecrã do treino.
 */
export function PendingSync() {
  const router = useRouter();
  useEffect(() => {
    let running = false;
    const run = async () => {
      if (running || navigator.onLine === false) return;
      const ids = pendingSessionIds();
      if (!ids.length) return;
      running = true;
      let changed = false;
      try {
        for (const id of ids) if (await syncSession(id).catch(() => null)) changed = true;
      } finally {
        running = false;
      }
      if (changed) router.refresh();
    };
    void run();
    window.addEventListener('online', run);
    return () => window.removeEventListener('online', run);
  }, [router]);
  return null;
}
