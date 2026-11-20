'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { moveExerciseHistory } from '@/actions/fitness';
import type { ExerciseView } from '@/lib/fitness/types';
import { Button } from '@/components/ui/Button';
import { ExercisePicker } from './ExercisePicker';

/**
 * "Mover o histórico para outro exercício" (em "Detalhes e ações"): para quem registou séries no exercício errado
 * (ex.: passada com barra em vez de com halteres). Só na conta da pessoa; os recordes recalculam-se.
 */
export function MoveHistory({ exerciseId, name, exercises }: { exerciseId: string; name: string; exercises: ExerciseView[] }) {
  const t = useTranslations('fitness.moveHistory');
  const te = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mg-form">
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {t('button')}
      </Button>
      <p className="mg-form__status">{t('hint')}</p>
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <ExercisePicker
        exercises={exercises.filter((e) => e.id !== exerciseId)}
        open={open}
        multiple={false}
        onClose={() => setOpen(false)}
        confirmLabel={t('confirm')}
        onConfirm={async (sel) => {
          const to = sel[0];
          const target = exercises.find((e) => e.id === to);
          if (!to || !target) return;
          if (!window.confirm(t('sure', { from: name, to: target.name }))) return;
          const res = await moveExerciseHistory(exerciseId, to);
          setOpen(false);
          if (!res.ok) return setError(te(res.error));
          router.push(`/exercises/${encodeURIComponent(to)}`);
          router.refresh();
        }}
      />
    </div>
  );
}
