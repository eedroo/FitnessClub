'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createPost } from '@/actions/social';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PhotoPicker } from './PhotoPicker';
import { CheckChip } from '@/components/ui/CheckChip';

export interface ShareOption {
  value: string; // "session:<id>" | "activity:<id>" | "day:<data>" | "badge:<id>" | "level" | "tier:<id>" | "league:<domingo>"
  label: string;
  /** Grupo na lista (treinos, dias, conquistas). */
  group: 'workouts' | 'days' | 'achievements';
}

/**
 * Escrever um post: texto, fotos (até 4), o que partilhar (treinos, dias ou conquistas) e para quem. Com fotos e um
 * anexo, "Carrossel" (ligado por defeito) mostra a foto na capa e o anexo num slide editorial a seguir.
 */
export function PostComposer({ userId, options, initialAttach = '' }: { userId: string; options: ShareOption[]; initialAttach?: string }) {
  const t = useTranslations('social.composer');
  const te = useTranslations();
  const router = useRouter();
  const [text, setText] = useState('');
  const [attach, setAttach] = useState(initialAttach);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FRIENDS'>('FRIENDS');
  const [images, setImages] = useState<string[]>([]);
  const [carousel, setCarousel] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const publish = () =>
    start(async () => {
      const [kind, id] = attach.split(':');
      const res = await createPost({
        text,
        visibility,
        images,
        sessionId: kind === 'session' ? id : null,
        activityId: kind === 'activity' ? id : null,
        attach: attach && kind !== 'session' && kind !== 'activity' ? attach : null,
        carousel: carousel && images.length > 0 && !!attach,
      });
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
            {(['workouts', 'days', 'achievements'] as const).map((g) => {
              const list = options.filter((o) => o.group === g);
              return list.length ? (
                <optgroup key={g} label={t(`groups.${g}`)}>
                  {list.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </select>
        </label>
      )}
      {images.length > 0 && attach && (
        <CheckChip icon="sparkles" label={t('carousel')} checked={carousel} onCheckedChange={setCarousel} />
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
