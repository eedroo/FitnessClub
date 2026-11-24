import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft, Settings } from 'lucide-react';
import { BackButton } from './BackButton';

/**
 * Barra de navegação numa só linha. Páginas de topo (sem `backHref`): título grande à esquerda e as definições (⚙) à
 * direita, alinhados. Páginas de dentro: botão redondo ‹ à esquerda, o título ao lado e as acções à direita. Com
 * `historyBack`, ‹ regressa à página anterior (e `backHref` só serve quando não há histórico).
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
  const sub = historyBack || !!backHref;
  return (
    <header className={sub ? 'mg-body-header mg-body-header--sub' : 'mg-body-header'}>
      {historyBack ? (
        <BackButton fallback={backHref ?? '/'} label={backLabel ?? tc('back')} className="mg-body-header__back" />
      ) : backHref ? (
        <Link href={backHref} className="mg-body-header__back" aria-label={backLabel ?? tc('back')}>
          <ChevronLeft size={26} strokeWidth={2.25} aria-hidden="true" />
        </Link>
      ) : null}
      <h1 className="mg-body-header__title">{title}</h1>
      {(actions || (!historyBack && !backHref)) && (
        <div className="mg-body-header__actions">
          {actions}
          {!historyBack && !backHref && (
            <Link href="/settings" className="mg-body-header__icon" aria-label={backLabel ?? t('settingsLink')} data-tour="settings">
              <Settings size={24} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
