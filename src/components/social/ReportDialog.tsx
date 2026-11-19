'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { report } from '@/actions/social';
import { Button } from '@/components/ui/Button';

const REASONS = ['spam', 'harassment', 'hate', 'nudity', 'violence', 'self_harm', 'misinformation', 'other'] as const;

/** Denunciar um post, comentário ou pessoa: escolher o motivo; vai para a moderação. */
export function ReportDialog({ target, targetId, onClose }: { target: 'POST' | 'COMMENT' | 'USER'; targetId: string; onClose: () => void }) {
  const t = useTranslations('social.report');
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done)
    return (
      <div className="mg-social-sheet" role="status">
        <p className="mg-social-join__text">{t('thanks')}</p>
        <Button variant="ghost" onClick={onClose}>
          {t('close')}
        </Button>
      </div>
    );
  return (
    <div className="mg-social-sheet" role="group" aria-label={t('title')}>
      <p className="mg-social-sheet__title">{t('title')}</p>
      <div className="mg-social-sheet__options" role="radiogroup">
        {REASONS.map((r) => (
          <button key={r} type="button" role="radio" aria-checked={reason === r} className={reason === r ? 'mg-social-sheet__option mg-social-sheet__option--on' : 'mg-social-sheet__option'} onClick={() => setReason(r)}>
            {t(`reasons.${r}`)}
          </button>
        ))}
      </div>
      <div className="mg-ai-actions__row">
        <Button variant="subtle" onClick={onClose} disabled={pending}>
          {t('cancel')}
        </Button>
        <Button
          variant="danger"
          loading={pending}
          disabled={!reason}
          onClick={() =>
            start(async () => {
              const res = await report({ target, targetId, reason: reason! });
              if (res.ok) setDone(true);
            })
          }
        >
          {t('send')}
        </Button>
      </div>
    </div>
  );
}
