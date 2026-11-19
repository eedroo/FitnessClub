'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, X } from 'lucide-react';
import { uploadPhoto } from '@/lib/media/upload';
import { MAX_POST_IMAGES } from '@/lib/media/blob';

/** Fotos de uma publicação (até 4): escolher na galeria ou câmara, ver as miniaturas e tirar. Envia logo para o Blob. */
export function PhotoPicker({ userId, value, onChange, onBusy }: { userId: string; value: string[]; onChange: (urls: string[]) => void; onBusy: (busy: boolean) => void }) {
  const t = useTranslations('social.photos');
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState(false);
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, MAX_POST_IMAGES - value.length);
    setError(false);
    setUploading(list.length);
    onBusy(true);
    const urls: string[] = [];
    for (const f of list) {
      try {
        urls.push(await uploadPhoto(f, 'posts', userId));
      } catch {
        setError(true);
      }
      setUploading((n) => n - 1);
    }
    onBusy(false);
    onChange([...value, ...urls]);
    if (input.current) input.current.value = '';
  };
  return (
    <div className="mg-photos">
      <div className="mg-photos__grid">
        {value.map((url) => (
          <span key={url} className="mg-photos__thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" />
            <button type="button" className="mg-photos__remove" aria-label={t('remove')} onClick={() => onChange(value.filter((u) => u !== url))}>
              <X size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </span>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <span key={`up-${i}`} className="mg-photos__thumb mg-photos__thumb--loading" aria-label={t('uploading')} />
        ))}
        {value.length + uploading < MAX_POST_IMAGES && (
          <button type="button" className="mg-photos__add" onClick={() => input.current?.click()} aria-label={t('add')}>
            <ImagePlus size={24} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void pick(e.target.files)} />
      {error && (
        <p className="mg-set-input__error" role="alert">
          {t('error')}
        </p>
      )}
    </div>
  );
}
