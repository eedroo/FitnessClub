import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft, Settings } from 'lucide-react';
import { BackButton } from './BackButton';

/**
 * Barra de navegação do iOS com título grande: voltar à esquerda (‹ e o nome da secção), acções à direita e o título
 * grande por baixo. Nas páginas de topo (sem `backHref`), à direita, o botão das definições (⚙). Com `historyBack`, "Voltar" regressa
 * à página anterior (e `backHref` só serve quando não há histórico).
 */
export async function BodyHeader({
  title,
  backHref,
  backLabel,
  actions,
  historyBack = false,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  historyBack?: boolean;
}) {
  const [t, tc] = await Promise.all([getTranslations('fitness'), getTranslations('common')]);
  return (
    <header className="mg-body-header">
      {historyBack ? (
        <BackButton fallback={backHref ?? '/'} label={tc('back')} className="mg-body-header__back" />
      ) : backHref ? (
        <Link href={backHref} className="mg-body-header__back">
          <ChevronLeft size={28} strokeWidth={2.25} aria-hidden="true" />
          {backLabel ?? tc('back')}
        </Link>
      ) : null}
      <h1 className="mg-body-header__title">{title}</h1>
      {(actions || (!historyBack && !backHref)) && (
        <div className="mg-body-header__actions">
          {actions}
          {!historyBack && !backHref && (
            <Link href="/settings" className="mg-body-header__icon" aria-label={backLabel ?? t('settingsLink')}>
              <Settings size={24} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
