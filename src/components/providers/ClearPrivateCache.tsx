'use client';

import { useEffect } from 'react';

/**
 * Em login, registo e despedida: apaga as páginas guardadas para uso sem rede (têm dados da pessoa), para que
 * quem entrar a seguir no mesmo dispositivo nunca as veja.
 */
export function ClearPrivateCache() {
  useEffect(() => {
    if (!('caches' in window)) return;
    // Fica só a página /offline (não tem dados de ninguém).
    caches
      .open('fc-pages')
      .then(async (c) => Promise.all((await c.keys()).filter((k) => new URL(k.url).pathname !== '/offline').map((k) => c.delete(k))))
      .catch(() => undefined);
  }, []);
  return null;
}
