'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { requestWeekInsight, setAiConsent } from '@/actions/ai';
import { Button } from '@/components/ui/Button';
import { AiConsentPanel } from './AiConsentPanel';

/** Pede a retrospectiva da última semana completa (pedindo antes o consentimento, se faltar). */
export function InsightButton({ consent }: { consent: boolean }) {
  const t = useTranslations('ai.insights');
  const te = useTranslations();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const go = (withConsent: boolean) =>
    start(async () => {
      setError(null);
      if (withConsent) {
        const c = await setAiConsent(true);
        if (!c.ok) return setError(te(c.error));
      }
      const res = await requestWeekInsight();
      if (!res.ok) return setError(te(res.error));
      router.push(`/insights/${res.data.id}`);
    });

  return (
    <div className="mg-ai-actions">
      {asking ? (
        <AiConsentPanel pending={pending} onCancel={() => setAsking(false)} onAccept={() => go(true)} />
      ) : (
        <Button block loading={pending} onClick={() => (consent ? go(false) : setAsking(true))}>
          {t('request')}
        </Button>
      )}
      {error && (
        <p className="mg-form__status mg-form__status--error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
