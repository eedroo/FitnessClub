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

interface TrainingPrefsFormProps {
  initial: { defaultRestSec: number; restAlert: boolean; keepAwake: boolean };
}

/** Definições → Treino: descanso por defeito, aviso de fim de descanso e ecrã aceso durante a sessão. */
export function TrainingPrefsForm({ initial }: TrainingPrefsFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const known = (RESTS as readonly string[]).includes(String(initial.defaultRestSec));
  const [rest, setRest] = useState<Rest | null>(known ? (String(initial.defaultRestSec) as Rest) : null);
  const [restAlert, setRestAlert] = useState(initial.restAlert);
  const [keepAwake, setKeepAwake] = useState(initial.keepAwake);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await updateFitnessPrefs({ ...(rest && { defaultRestSec: Number(rest) }), restAlert, keepAwake });
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
