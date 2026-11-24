'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { requestPremium } from '@/actions/account';
import { Button } from '@/components/ui/Button';

/**
 * Para quem não é Premium: "A IA é só para Premium" e o botão "Quero o Premium", que envia o pedido ao admin
 * (que liberta à mão). Depois de pedir mostra que o pedido foi enviado.
 */
export function PremiumRequest({ requested }: { requested: boolean }) {
  const t = useTranslations('premium.request');
  const te = useTranslations();
  const [sent, setSent] = useState(requested);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mg-premium-request">
      <p className="mg-premium-request__text">{t('text')}</p>
      {sent ? (
        <p className="mg-premium-request__sent" role="status">
          {t('sent')}
        </p>
      ) : (
        <Button
          className="mg-btn--body"
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await requestPremium();
              if (!res.ok) return setError(te(res.error));
              setSent(true);
            })
          }
        >
          {t('cta')}
        </Button>
      )}
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
