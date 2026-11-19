'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

/** Pedido de consentimento antes do primeiro uso da IA: o que sai, para quem, e como retirar. */
export function AiConsentPanel({ onAccept, onCancel, pending }: { onAccept: () => void; onCancel: () => void; pending: boolean }) {
  const t = useTranslations('ai.consent');
  return (
    <div className="mg-ai-consent" role="group" aria-label={t('title')}>
      <h3 className="mg-ai-consent__title">{t('title')}</h3>
      <p className="mg-ai-consent__text">{t('text')}</p>
      <ul className="mg-ai-consent__list">
        <li>{t('sends')}</li>
        <li>{t('never')}</li>
        <li>{t('withdraw')}</li>
      </ul>
      <p className="mg-ai-consent__text">
        <Link href="/privacy" target="_blank">
          {t('policy')}
        </Link>
      </p>
      <div className="mg-ai-consent__actions">
        <Button variant="subtle" onClick={onCancel} disabled={pending}>
          {t('cancel')}
        </Button>
        <Button loading={pending} onClick={onAccept}>
          {t('accept')}
        </Button>
      </div>
    </div>
  );
}
