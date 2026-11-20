import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { getWorkout, listExercises } from '@/lib/fitness/queries';
import { BodyHeader } from '@/components/body/BodyHeader';
import { NotesCard } from '@/components/body/NotesCard';
import { WorkoutForm } from '@/components/body/WorkoutForm';
import { WorkoutItems } from '@/components/body/WorkoutItems';
import { StartSessionButton } from '@/components/body/StartSessionButton';
import { getStrengthBests } from '@/lib/gamification/server';
import { strengthLevel } from '@/lib/gamification/strength';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness');
  return { title: t('title') };
}

/** Exercícios do treino com o alvo; adicionar, reordenar, editar; "Começar treino". */
export default async function WorkoutRoute({ params }: { params: { id: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, workout, exercises] = await Promise.all([getTranslations('fitness'), getWorkout(userId, params.id, locale), listExercises(userId, locale)]);
  if (!workout) notFound();
  // Medalha do nível de força ao lado de cada exercício com padrão.
  const strength = await getStrengthBests(userId, workout.items.map((i) => i.exercise.id));
  const items = workout.items.map((i) => {
    const best = strength.best[i.exercise.id];
    return { ...i, tier: best ? (strengthLevel(i.exercise.id, best, strength.bodyGrams)?.tier ?? null) : null };
  });
  return (
    <>
      <BodyHeader title={workout.name} backHref={`/programs/${workout.programId}`} backLabel={workout.programName} />
      <div className="mg-body-shell__main">
        <WorkoutItems workoutId={workout.id} items={items} exercises={exercises} />
        <NotesCard kind="workout" targetId={workout.id} initial={workout.notes} byAi={workout.notesByAi} />
        <WorkoutForm programId={workout.programId} workout={{ id: workout.id, name: workout.name, notes: workout.notes }} />
        {workout.items.length > 0 && (
          <div className="mg-body-cta">
            <StartSessionButton workoutId={workout.id} label={t('workouts.start')} />
          </div>
        )}
      </div>
    </>
  );
}
