'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setAiConsent, setWeeklyInsights } from '@/actions/ai';
import { Button } from '@/components/ui/Button';
import { CheckChip } from '@/components/ui/CheckChip';

interface AiSettingsCardProps {
  consentedOn: string | null; // data formatada ou null
  feature: boolean; // recurso `ai`
  weekly: boolean;
}

/** Privacidade › IA: consentimento (dar/retirar) e a retrospectiva automática ao domingo. */
export function AiSettingsCard({ consentedOn, feature, weekly }: AiSettingsCardProps) {
  const t = useTranslations('ai.settings');
  const router = useRouter();
  const [on, setOn] = useState(weekly);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="mg-form" id="ai">
      <h3 className="mg-form__title">{t('title')}</h3>
      <p className="mg-form__status">{t('text')}</p>
      {consentedOn ? (
        <>
          <p className="mg-form__status mg-form__status--ok">{t('givenOn', { date: consentedOn })}</p>
          {feature && (
            <CheckChip
              icon="sparkles"
              label={t('weekly')}
              checked={on}
              onCheckedChange={(v) => {
                setOn(v);
                run(() => setWeeklyInsights(v));
              }}
            />
          )}
          <div className="mg-form__row">
            <Button variant="subtle" loading={pending} onClick={() => run(() => setAiConsent(false))}>
              {t('withdraw')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mg-form__status">{t('none')}</p>
          {feature && (
            <div className="mg-form__row">
              <Button variant="ghost" loading={pending} onClick={() => run(() => setAiConsent(true))}>
                {t('grant')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
