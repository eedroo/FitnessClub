'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { saveTrainingProfile } from '@/actions/profile';
import type { TrainingProfileData } from '@/lib/fitness/profile';
import { Button } from '@/components/ui/Button';
import { CircleCheck } from 'lucide-react';
import { ProfileStep, type ProfileStepId } from './ProfileStep';

const STEPS: ProfileStepId[] = ['goals', 'level', 'weight', 'equipment', 'focus', 'days', 'wishes'];

/**
 * O perfil de treino numa só página (definições): todas as perguntas em cartões e "Guardar" fixo em baixo. Ao gravar
 * mostra uma confirmação grande e volta sozinho às definições.
 */
export function TrainingProfileForm({ initial, weightAllowed }: { initial: TrainingProfileData; weightAllowed: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [weightKg, setWeightKg] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await saveTrainingProfile({ ...profile, weightKg });
      if (!res.ok) return setStatus({ ok: false, text: t(res.error) });
      setStatus(null);
      setSaved(true);
      setTimeout(() => {
        router.push('/settings#trainingProfile');
        router.refresh();
      }, 1200);
    });

  return (
    <div className="mg-profile-form">
      {STEPS.map((id) => (
        <div key={id} className="mg-card mg-profile-form__card">
          <ProfileStep id={id} value={profile} onChange={setProfile} weightKg={weightKg} onWeightKg={setWeightKg} weightAllowed={weightAllowed} />
        </div>
      ))}
      {saved && (
        <div className="mg-profile-form__saved" role="status" aria-live="assertive">
          <CircleCheck size={44} strokeWidth={1.75} aria-hidden="true" />
          <strong>{t('fitness.profile.savedTitle')}</strong>
          <span>{t('fitness.profile.savedText')}</span>
        </div>
      )}
      <div className="mg-profile-form__bar">
        {status && (
          <p className={status.ok ? 'mg-form__status mg-form__status--ok' : 'mg-form__status mg-form__status--error'} role="status">
            {status.text}
          </p>
        )}
        <Button block loading={pending || saved} loadingLabel={t('common.saving')} onClick={save}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
