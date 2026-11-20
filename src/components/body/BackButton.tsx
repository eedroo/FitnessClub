'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { NAV_STACK_KEY, canGoBack, readStack } from '@/lib/nav-history';

/**
 * Voltar à página de onde se veio (sessão, treino, mapa muscular, biblioteca…). Sem histórico dentro da app (link
 * aberto de fora), vai para `fallback`.
 */
export function BackButton({ fallback, label, className }: { fallback: string; label: string; className?: string }) {
  // O nome fica só para leitores de ecrã: o botão é a seta, como nas apps do iPhone.
  const router = useRouter();
  return (
    <Link
      href={fallback}
      className={className}
      aria-label={label}
      onClick={(e) => {
        let fromApp = false;
        try {
          fromApp = canGoBack(readStack(sessionStorage.getItem(NAV_STACK_KEY)));
        } catch {
          /* sem armazenamento: vai para o fallback */
        }
        if (!fromApp) return;
        e.preventDefault();
        router.back();
      }}
    >
      <ChevronLeft size={26} strokeWidth={2.25} aria-hidden="true" />
    </Link>
  );
}
