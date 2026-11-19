'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { requestAiProgram, setAiConsent } from '@/actions/ai';
import type { TrainingProfileData } from '@/lib/fitness/profile';
import { ProfileStep, type ProfileStepId } from '@/components/profile/ProfileStep';
import { Button } from '@/components/ui/Button';
import { AiConsentPanel } from './AiConsentPanel';

const STEPS: ProfileStepId[] = ['goals', 'level', 'equipment', 'focus', 'days', 'wishes'];

/**
 * "Novo programa com IA": as perguntas de cada vez (objectivos, nível, onde e com quê, foco, dias e tempo, pedidos),
 * já preenchidas com as respostas da última vez; no fim pede o consentimento, se faltar, e envia o pedido.
 */
export function AiProgramWizard({ initial, consent }: { initial: TrainingProfileData; consent: boolean }) {
  const t = useTranslations('ai.wizard');
  const te = useTranslations();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState(initial);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const last = step === STEPS.length - 1;

  const send = (withConsent: boolean) =>
    start(async () => {
      setError(null);
      if (withConsent) {
        const c = await setAiConsent(true);
        if (!c.ok) return setError(te(c.error));
      }
      const res = await requestAiProgram(brief);
      if (!res.ok) return setError(te(res.error));
      router.push(`/ai/program/${res.data.id}`);
    });

  return (
    <div className="mg-body-welcome">
      <div className="mg-body-welcome__progress" aria-hidden="true">
        {STEPS.map((id, i) => (
          <span key={id} className={i <= step ? 'mg-body-welcome__dot mg-body-welcome__dot--done' : 'mg-body-welcome__dot'} />
        ))}
      </div>
      {step === 0 && <p className="mg-body-welcome__text">{t('intro')}</p>}
      <ProfileStep id={STEPS[step]!} value={brief} onChange={setBrief} weightKg="" onWeightKg={() => undefined} weightAllowed={false} />
      {asking && <AiConsentPanel pending={pending} onCancel={() => setAsking(false)} onAccept={() => send(true)} />}
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      {!asking && (
        <div className="mg-body-welcome__actions">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}>
              {t('back')}
            </Button>
          ) : (
            <span />
          )}
          {last ? (
            <Button className="mg-btn--body" loading={pending} onClick={() => (consent ? send(false) : setAsking(true))}>
              {t('create')}
            </Button>
          ) : (
            <Button className="mg-btn--body" onClick={() => setStep(step + 1)}>
              {t('next')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
