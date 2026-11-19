'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { requestAiProgram, setAiConsent } from '@/actions/ai';
import { Button } from '@/components/ui/Button';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { AiConsentPanel } from './AiConsentPanel';

interface AiProgramCardProps {
  feature: boolean; // recurso `ai` (premium)
  consent: boolean;
  hasProfile: boolean;
}

/** "Criar programa com IA": premium; sem perfil leva ao perfil; sem consentimento pede-o primeiro. */
export function AiProgramCard({ feature, consent, hasProfile }: AiProgramCardProps) {
  const t = useTranslations('ai.program');
  const te = useTranslations();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const create = (withConsent: boolean) =>
    start(async () => {
      setError(null);
      if (withConsent) {
        const c = await setAiConsent(true);
        if (!c.ok) return setError(te(c.error));
      }
      const res = await requestAiProgram();
      if (!res.ok) return setError(te(res.error));
      router.push(`/ai/program/${res.data.id}`);
    });

  return (
    <section className="mg-ai-card" aria-labelledby="ai-program-title">
      <div className="mg-ai-card__head">
        <span className="mg-ai-card__icon" aria-hidden="true">
          <MagicIcon name="sparkles" size="sm" decorative />
        </span>
        <span className="mg-ai-card__text">
          <span id="ai-program-title" className="mg-ai-card__title">
            {t('title')}
          </span>
          <span className="mg-ai-card__meta">{feature ? t('text') : t('premium')}</span>
        </span>
        {!feature && <span className="mg-ai-card__badge">{t('premiumBadge')}</span>}
      </div>
      {feature && !asking && (
        <div className="mg-ai-card__actions">
          {hasProfile ? (
            <Button loading={pending} onClick={() => (consent ? create(false) : setAsking(true))}>
              {t('create')}
            </Button>
          ) : (
            <Link href="/training-profile" className="mg-btn mg-btn--ghost">
              {t('needProfile')}
            </Link>
          )}
        </div>
      )}
      {asking && <AiConsentPanel pending={pending} onCancel={() => setAsking(false)} onAccept={() => create(true)} />}
      {error && (
        <p className="mg-form__status mg-form__status--error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
