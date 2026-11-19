'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createPost } from '@/actions/social';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PhotoPicker } from './PhotoPicker';

export interface ShareOption {
  value: string; // "session:<id>" | "activity:<id>"
  label: string;
}

/** Escrever um post: texto, fotos (até 4), treino a partilhar (as últimas sessões e atividades) e para quem (público ou só amigos). */
export function PostComposer({ userId, options, initialAttach = '' }: { userId: string; options: ShareOption[]; initialAttach?: string }) {
  const t = useTranslations('social.composer');
  const te = useTranslations();
  const router = useRouter();
  const [text, setText] = useState('');
  const [attach, setAttach] = useState(initialAttach);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FRIENDS'>('FRIENDS');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const publish = () =>
    start(async () => {
      const [kind, id] = attach.split(':');
      const res = await createPost({ text, visibility, images, sessionId: kind === 'session' ? id : null, activityId: kind === 'activity' ? id : null });
      if (!res.ok) return setError(te(res.error));
      setText('');
      setAttach('');
      setImages([]);
      setError(null);
      router.replace('/feed');
      router.refresh();
    });
  return (
    <section className="mg-composer" aria-label={t('title')}>
      <textarea className="mg-input mg-composer__text" rows={3} maxLength={2000} placeholder={t('placeholder')} value={text} onChange={(e) => setText(e.target.value)} />
      <PhotoPicker userId={userId} value={images} onChange={setImages} onBusy={setUploading} />
      {options.length > 0 && (
        <label className="mg-activity-form__field">
          {t('attach')}
          <select className="mg-input" value={attach} onChange={(e) => setAttach(e.target.value)}>
            <option value="">{t('noAttach')}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <SegmentedControl
        name="visibility"
        legend={t('visibility')}
        value={visibility}
        onChange={(v) => setVisibility(v as 'PUBLIC' | 'FRIENDS')}
        options={[
          { value: 'FRIENDS', label: t('friends') },
          { value: 'PUBLIC', label: t('public') },
        ]}
      />
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <Button block loading={pending} disabled={uploading || (!text.trim() && !attach && !images.length)} onClick={publish}>
        {t('publish')}
      </Button>
    </section>
  );
}
