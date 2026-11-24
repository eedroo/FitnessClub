'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export type ProfileTab = 'body' | 'posts' | 'badges' | 'strength';

/**
 * Separadores do perfil, logo a seguir ao cabeçalho: Corpo (só no "Eu") · Publicações · Emblemas · Força. Abre no
 * primeiro que existir; o conteúdo vem do servidor.
 */
export function ProfileTabs({ panels }: { panels: Partial<Record<ProfileTab, ReactNode>> }) {
  const t = useTranslations('social.profileTabs');
  const keys = (['body', 'posts', 'badges', 'strength'] as const).filter((k) => panels[k] !== undefined);
  const [tab, setTab] = useState<ProfileTab>(keys[0] ?? 'posts');
  return (
    <>
      <div className="mg-ex-tabs mg-profile-tabs" role="tablist" aria-label={t('label')}>
        {keys.map((k) => (
          <button
            key={k}
            id={`profile-tab-${k}`}
            type="button"
            role="tab"
            aria-selected={tab === k}
            aria-controls={`profile-panel-${k}`}
            className="mg-ex-tabs__tab"
            onClick={() => setTab(k)}
          >
            {t(k)}
          </button>
        ))}
      </div>
      {keys.map((k) => (
        <div key={k} id={`profile-panel-${k}`} role="tabpanel" aria-labelledby={`profile-tab-${k}`} className="mg-profile-tabs__panel" hidden={tab !== k}>
          {panels[k]}
        </div>
      ))}
    </>
  );
}
