import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft, Settings } from 'lucide-react';
import { BackButton } from './BackButton';

/**
 * Cabeçalho das páginas do treino: voltar (sem `backHref`, nas páginas de topo, o link das definições), título e acções. Com `historyBack`, "Voltar" regressa
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
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          {backLabel ?? tc('back')}
        </Link>
      ) : (
        <Link href="/settings" className="mg-body-header__back">
          <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
          {backLabel ?? t('settingsLink')}
        </Link>
      )}
      <h1 className="mg-body-header__title">{title}</h1>
      {actions && <div className="mg-body-header__actions">{actions}</div>}
    </header>
  );
}
