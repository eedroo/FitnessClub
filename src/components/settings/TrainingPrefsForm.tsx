'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { updateFitnessPrefs } from '@/actions/fitness';
import { Button } from '@/components/ui/Button';
import { CheckChip } from '@/components/ui/CheckChip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

const RESTS = ['60', '90', '120', '180'] as const;
type Rest = (typeof RESTS)[number];
const WEIGH_INS = ['OFF', 'DAILY', 'WEEKLY'] as const;
type WeighIn = (typeof WEIGH_INS)[number];

interface TrainingPrefsFormProps {
  initial: { defaultRestSec: number; restAlert: boolean; keepAwake: boolean; weighInFrequency: WeighIn };
  /** Sem o consentimento de dados de saúde o pedido de pesagem não aparece (o peso não se pode guardar). */
  hasConsent: boolean;
}

/** Definições → Treino: descanso por defeito, avisos, ecrã aceso durante a sessão e lembrete de pesagem. */
export function TrainingPrefsForm({ initial, hasConsent }: TrainingPrefsFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const known = (RESTS as readonly string[]).includes(String(initial.defaultRestSec));
  const [rest, setRest] = useState<Rest | null>(known ? (String(initial.defaultRestSec) as Rest) : null);
  const [restAlert, setRestAlert] = useState(initial.restAlert);
  const [keepAwake, setKeepAwake] = useState(initial.keepAwake);
  const [weighIn, setWeighIn] = useState<WeighIn>(initial.weighInFrequency);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await updateFitnessPrefs({ ...(rest && { defaultRestSec: Number(rest) }), restAlert, keepAwake, weighInFrequency: weighIn });
      setStatus(res.ok ? { ok: true, text: t('common.saved') } : { ok: false, text: t(res.error) });
      if (res.ok) router.refresh();
    });

  return (
    <div className="mg-form">
      <SegmentedControl<Rest>
        name="default-rest"
        legend={t('settings.training.rest')}
        value={rest ?? undefined}
        onChange={setRest}
        options={RESTS.map((value) => ({ value, label: t('fitness.welcome.seconds', { n: Number(value) }) }))}
      />
      {!known && <p className="mg-form__status">{t('settings.training.restCustom', { n: initial.defaultRestSec })}</p>}
      <div className="mg-form__row">
        <CheckChip icon="bell" label={t('fitness.welcome.alertToggle')} checked={restAlert} onCheckedChange={setRestAlert} />
        <CheckChip icon="sparkles" label={t('settings.training.keepAwake')} checked={keepAwake} onCheckedChange={setKeepAwake} />
      </div>
      <SegmentedControl<WeighIn>
        name="weigh-in"
        legend={t('settings.training.weighIn')}
        value={weighIn}
        onChange={setWeighIn}
        options={WEIGH_INS.map((value) => ({ value, label: t(`settings.training.weighInOptions.${value}`) }))}
      />
      {weighIn !== 'OFF' && !hasConsent && <p className="mg-form__status">{t('settings.training.weighInConsent')}</p>}
      <div className="mg-form__row">
        <Button onClick={save} loading={pending} loadingLabel={t('common.saving')}>
          {t('common.save')}
        </Button>
        {status && (
          <p className={status.ok ? 'mg-form__status mg-form__status--ok' : 'mg-form__status mg-form__status--error'} role="status">
            {status.text}
          </p>
        )}
      </div>
    </div>
  );
}
