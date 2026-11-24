'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

const VIEW = 280; // lado da janela de recorte (px de ecrã)
const OUT = 512; // lado da foto final
const MAX_ZOOM = 4;

type Pos = { x: number; y: number };

/**
 * Antes de guardar a foto de perfil: arrastar para enquadrar e aproximar (dois dedos, roda do rato ou a barra).
 * O círculo mostra o que fica no perfil; sai um quadrado de 512 px (WebP, ou JPEG no Safari antigo).
 */
export function AvatarCropper({ file, onCancel, onConfirm }: { file: File; onCancel: () => void; onConfirm: (blob: Blob) => void }) {
  const t = useTranslations('social.photos');
  const ref = useRef<HTMLDialogElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const img = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, Pos>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    ref.current?.showModal();
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const base = size ? VIEW / Math.min(size.w, size.h) : 1;
  const clamp = (p: Pos, z: number): Pos => {
    if (!size) return p;
    const mx = Math.max(0, (size.w * base * z - VIEW) / 2);
    const my = Math.max(0, (size.h * base * z - VIEW) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  };
  const setZoomTo = (z: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, z));
    setZoom(next);
    setPos((p) => clamp(p, next));
  };

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [Pos, Pos];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()] as [Pos, Pos];
      setZoomTo((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist);
    } else if (pointers.current.size === 1) {
      setPos((p) => clamp({ x: p.x + now.x - prev.x, y: p.y + now.y - prev.y }, zoom));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const confirm = async () => {
    const el = img.current;
    if (!el || !size) return;
    const scale = base * zoom;
    const side = VIEW / scale;
    const sx = size.w / 2 - pos.x / scale - side / 2;
    const sy = size.h / 2 - pos.y / scale - side / 2;
    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    canvas.getContext('2d')!.drawImage(el, sx, sy, side, side, 0, 0, OUT, OUT);
    const webp = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.88));
    const blob = webp?.type === 'image/webp' ? webp : await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
    if (blob) onConfirm(blob);
  };

  const scale = base * zoom;
  return (
    <dialog ref={ref} className="mg-body-sheet mg-cropper" onClose={onCancel} aria-labelledby="cropper-title">
      <h2 id="cropper-title" className="mg-body-sheet__title">
        {t('cropTitle')}
      </h2>
      <p className="mg-cropper__hint">{t('cropHint')}</p>
      <div
        className="mg-cropper__view"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => setZoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
      >
        {src && (
          // eslint-disable-next-line @next/next/no-img-element -- foto local (blob:) a recortar
          <img
            ref={img}
            className="mg-cropper__img"
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={size ? { width: size.w * scale, height: size.h * scale, transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)` } : undefined}
          />
        )}
        <span className="mg-cropper__mask" aria-hidden="true" />
      </div>
      <label className="mg-cropper__zoom">
        {t('zoom')}
        <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => setZoomTo(Number(e.target.value))} />
      </label>
      <div className="mg-body-sheet__actions">
        <Button className="mg-btn--body" disabled={!size} onClick={() => void confirm()}>
          {t('cropSave')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('cropCancel')}
        </Button>
      </div>
    </dialog>
  );
}
