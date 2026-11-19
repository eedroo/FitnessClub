'use client';

import dynamic from 'next/dynamic';

/** O mapa só corre no browser (Leaflet precisa do `window`). */
export const MapClient = dynamic(() => import('./InviteMap').then((m) => m.InviteMap), {
  ssr: false,
  loading: () => <div className="mg-map__canvas mg-map__canvas--loading" style={{ height: 320 }} />,
});
