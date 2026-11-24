'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Share2 } from 'lucide-react';
import { createPost } from '@/actions/social';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

/**
 * No resumo da sessão, junto às métricas: publicar este treino na comunidade com um toque (texto opcional e quem vê).
 * "Mais opções" abre o editor completo (fotos). Já partilhado: mostra a ligação para o feed.
 */
export function QuickShare({ sessionId, shared }: { sessionId: string; shared: boolean }) {
  const t = useTranslations('social.quickShare');
  const tc = useTranslations('social.composer');
  const te = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FRIENDS'>('FRIENDS');
  const [done, setDone] = useState(shared);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p className="mg-quick-share__done" role="status">
        {t('done')} · <Link href="/feed">{t('seeFeed')}</Link>
      </p>
    );
  }
  if (!open) {
    return (
      <Button className="mg-btn--body" block onClick={() => setOpen(true)}>
        <Share2 size={18} aria-hidden="true" /> {t('cta')}
      </Button>
    );
  }
  const publish = () =>
    start(async () => {
      const res = await createPost({ text: text.trim(), visibility, sessionId });
      if (!res.ok) return setError(te(res.error));
      setDone(true);
      router.refresh();
    });
  return (
    <section className="mg-quick-share" aria-label={t('cta')}>
      <textarea className="mg-input" rows={2} maxLength={2000} placeholder={tc('placeholder')} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      <SegmentedControl
        name="quick-share-visibility"
        legend={tc('visibility')}
        value={visibility}
        onChange={(v) => setVisibility(v as 'PUBLIC' | 'FRIENDS')}
        options={[
          { value: 'FRIENDS', label: tc('friends') },
          { value: 'PUBLIC', label: tc('public') },
        ]}
      />
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <div className="mg-quick-share__actions">
        <Button className="mg-btn--body" loading={pending} onClick={publish}>
          {tc('publish')}
        </Button>
        <Link href={`/feed/new?share=session:${sessionId}`} className="mg-btn mg-btn--ghost">
          {t('more')}
        </Link>
      </div>
    </section>
  );
}
