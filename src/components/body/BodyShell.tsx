import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { BodyNav } from './BodyNav';
import { ActiveSessionPill } from './ActiveSessionPill';

/** Layout do treino: conteúdo, pílula da sessão em curso e a navegação própria. */
export async function BodyShell({ children, activeSession }: { children: ReactNode; activeSession: { startedAt: string } | null }) {
  const t = await getTranslations('fitness');
  return (
    <div className="mg-body-shell">
      {children}
      {activeSession && <ActiveSessionPill startedAt={activeSession.startedAt} hideOn="/session" />}
      <BodyNav
        label={t('nav.label')}
        items={[
          { href: '/', label: t('nav.workouts'), match: ['/', '/programs', '/workouts'] },
          { href: '/sessions', label: t('nav.sessions'), match: ['/sessions', '/session'] },
          { href: '/day', label: t('nav.day'), match: ['/day'] },
          { href: '/corpo', label: t('nav.body'), match: ['/corpo', '/weight'] },
        ]}
      />
    </div>
  );
}
