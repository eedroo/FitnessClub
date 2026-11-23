'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * Aviso no topo enquanto o dispositivo está sem rede: o treino continua e as séries seguem quando a rede voltar.
 * Também pede ao service worker para guardar cada página aberta pela navegação interna (que não passa por ele),
 * para abrir sem rede; o service worker faz isto no máximo uma vez a cada 10 minutos por página.
 */
export function OfflineBanner() {
  const t = useTranslations('common.offline');
  const pathname = usePathname();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (navigator.onLine === false) return;
    navigator.serviceWorker?.controller?.postMessage({ type: 'keep-page', path: pathname });
  }, [pathname]);
  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="mg-banner mg-banner--offline" role="status">
      <p className="mg-banner__text">{t('banner')}</p>
    </div>
  );
}
