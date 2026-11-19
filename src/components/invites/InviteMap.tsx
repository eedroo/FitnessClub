'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Map as LeafletMap } from 'leaflet';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  href?: string;
}

/**
 * Mapa do OpenStreetMap (Leaflet) com pinos nos locais dos treinos. "Perto de mim" usa a localização só neste
 * telemóvel para centrar o mapa: não é guardada nem enviada a ninguém.
 */
export function InviteMap({ pins, height = 320, locate = false }: { pins: MapPin[]; height?: number; locate?: boolean }) {
  const t = useTranslations('invites.map');
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [locError, setLocError] = useState(false);

  useEffect(() => {
    let alive = true;
    void import('leaflet').then((L) => {
      if (!alive || !box.current || map.current) return;
      const m = L.map(box.current, { zoomControl: true, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      const icon = L.divIcon({ className: 'mg-map-pin', html: '<span class="mg-map-pin__dot"></span>', iconSize: [28, 28], iconAnchor: [14, 28] });
      const markers = pins.map((p) => {
        const mk = L.marker([p.lat, p.lng], { icon, title: p.label }).addTo(m);
        mk.bindTooltip(p.label, { direction: 'top', offset: [0, -26] });
        if (p.href) mk.on('click', () => router.push(p.href!));
        return mk;
      });
      if (markers.length === 1) m.setView([pins[0]!.lat, pins[0]!.lng], 15);
      else if (markers.length > 1) m.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
      else m.setView([39.5, -8], 6);
      map.current = m;
    });
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
    };
    // Os pinos vêm do servidor e não mudam enquanto o mapa está aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nearMe = () => {
    setLocError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => map.current?.setView([pos.coords.latitude, pos.coords.longitude], 12),
      () => setLocError(true),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  };

  return (
    <div className="mg-map">
      <div ref={box} className="mg-map__canvas" style={{ height }} role="region" aria-label={t('label')} />
      {locate && (
        <button type="button" className="mg-map__locate" onClick={nearMe}>
          {t('nearMe')}
        </button>
      )}
      {locError && <p className="mg-social-join__hint">{t('locError')}</p>}
    </div>
  );
}
