'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { saveTrainingProfile } from '@/actions/profile';
import type { TrainingProfileData } from '@/lib/fitness/profile';
import { Button } from '@/components/ui/Button';
import { ProfileStep, type ProfileStepId } from './ProfileStep';

const STEPS: ProfileStepId[] = ['goals', 'level', 'weight', 'equipment', 'focus', 'days', 'wishes'];

/** O perfil de treino numa só página (definições): todas as perguntas em cartões e "Guardar" fixo em baixo. */
export function TrainingProfileForm({ initial, weightAllowed }: { initial: TrainingProfileData; weightAllowed: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [weightKg, setWeightKg] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await saveTrainingProfile({ ...profile, weightKg });
      setStatus(res.ok ? { ok: true, text: t('common.saved') } : { ok: false, text: t(res.error) });
      if (res.ok) {
        setWeightKg('');
        router.refresh();
      }
    });

  return (
    <div className="mg-profile-form">
      {STEPS.map((id) => (
        <div key={id} className="mg-card mg-profile-form__card">
          <ProfileStep id={id} value={profile} onChange={setProfile} weightKg={weightKg} onWeightKg={setWeightKg} weightAllowed={weightAllowed} />
        </div>
      ))}
      <div className="mg-profile-form__bar">
        {status && (
          <p className={status.ok ? 'mg-form__status mg-form__status--ok' : 'mg-form__status mg-form__status--error'} role="status">
            {status.text}
          </p>
        )}
        <Button block loading={pending} loadingLabel={t('common.saving')} onClick={save}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
