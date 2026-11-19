'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setAvatar } from '@/actions/social';
import { uploadPhoto } from '@/lib/media/upload';
import { Button } from '@/components/ui/Button';
import { Avatar } from './Avatar';

/** Foto de perfil: escolher (reduzida a 512 px) ou tirar. */
export function AvatarPicker({ userId, name, url }: { userId: string; name: string; url: string | null }) {
  const t = useTranslations('social.photos');
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(false);
    try {
      const uploaded = await uploadPhoto(file, 'avatars', userId);
      start(async () => {
        const res = await setAvatar(uploaded);
        if (!res.ok) setError(true);
        router.refresh();
      });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mg-avatar-picker">
      <Avatar name={name} url={url} size={88} />
      <div className="mg-profile-actions">
        <Button variant="ghost" loading={busy || pending} onClick={() => input.current?.click()}>
          {url ? t('changeAvatar') : t('addAvatar')}
        </Button>
        {url && (
          <Button
            variant="subtle"
            disabled={busy || pending}
            onClick={() =>
              start(async () => {
                await setAvatar(null);
                router.refresh();
              })
            }
          >
            {t('removeAvatar')}
          </Button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      {error && (
        <p className="mg-set-input__error" role="alert">
          {t('error')}
        </p>
      )}
    </div>
  );
}
