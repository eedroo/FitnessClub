'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { NAV_STACK_KEY, pushPath, readStack } from '@/lib/nav-history';

/** Regista cada página aberta no app (para o "Voltar" regressar a ela). Sem armazenamento disponível, não faz nada. */
export function NavTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    try {
      const path = search.size ? `${pathname}?${search}` : pathname;
      const next = pushPath(readStack(sessionStorage.getItem(NAV_STACK_KEY)), path);
      sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(next));
    } catch {
      /* modo privado ou armazenamento bloqueado */
    }
  }, [pathname, search]);
  return null;
}
