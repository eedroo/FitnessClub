'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { addWorkoutItems, replaceWorkoutItem } from '@/actions/fitness';
import type { ExerciseView } from '@/lib/fitness/types';
import { Button } from '@/components/ui/Button';
import { ExercisePicker } from './ExercisePicker';
import { WorkoutItemRow, type WorkoutItemView } from './WorkoutItemRow';

/** Exercícios do treino com "Adicionar exercícios" e "Trocar" (folha de pesquisa). */
export function WorkoutItems({ workoutId, items, exercises }: { workoutId: string; items: WorkoutItemView[]; exercises: ExerciseView[] }) {
  const t = useTranslations('fitness.workouts');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);
  const ids = items.map((i) => i.id);
  return (
    <>
      {items.length ? (
        <ul className="mg-workout-items">
          {items.map((item, i) => (
            <WorkoutItemRow key={item.id} workoutId={workoutId} item={item} ids={ids} index={i} onReplace={() => setReplacing(item.id)} />
          ))}
        </ul>
      ) : (
        <p className="mg-body-empty">{t('noItems')}</p>
      )}
      <Button variant="subtle" onClick={() => setOpen(true)}>
        {t('addExercises')}
      </Button>
      <ExercisePicker
        exercises={exercises}
        open={open}
        onClose={() => setOpen(false)}
        confirmLabel={t('add')}
        onConfirm={async (sel) => {
          await addWorkoutItems(workoutId, sel);
          router.refresh();
        }}
      />
      {/* Trocar um exercício por outro, mantendo séries, reps e descanso (e a nota, se o novo não tiver). */}
      <ExercisePicker
        exercises={exercises}
        open={replacing !== null}
        multiple={false}
        onClose={() => setReplacing(null)}
        confirmLabel={t('replace')}
        onConfirm={async (sel) => {
          if (replacing && sel[0]) await replaceWorkoutItem(replacing, sel[0]);
          setReplacing(null);
          router.refresh();
        }}
      />
    </>
  );
}
