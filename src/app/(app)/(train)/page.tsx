import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { countCustomExercises, getTrainingProfile, listPrograms } from '@/lib/fitness/queries';
import { FITNESS_TEMPLATES } from '@/lib/fitness/templates';
import { BodyHeader } from '@/components/body/BodyHeader';
import { ProgramList } from '@/components/body/ProgramList';
import { ProgramForm } from '@/components/body/ProgramForm';
import { StartSessionButton } from '@/components/body/StartSessionButton';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness');
  return { title: t('title') };
}

/** Treinos: programas, os meus exercícios e um treino livre (as boas-vindas são o onboarding, em `/welcome`). */
export default async function BodyHome() {
  const { userId } = await bodyPage();
  const [t, programs, custom, profile] = await Promise.all([
    getTranslations('fitness'),
    listPrograms(userId),
    countCustomExercises(userId),
    getTrainingProfile(userId),
  ]);
  const templates = FITNESS_TEMPLATES.map((tpl) => ({ id: tpl.id, name: t(`templates.${tpl.id}.name`), description: t(`templates.${tpl.id}.description`) }));

  return (
    <>
      <BodyHeader title={t('title')} />
      <div className="mg-body-shell__main">
        {/* Quem entrou antes das boas-vindas novas: convite a preencher o perfil de treino. */}
        {!profile && (
          <Link href="/training-profile" className="mg-program-row">
            <span className="mg-program-row__text">
              <span className="mg-program-row__name">{t('profile.homeTitle')}</span>
              <span className="mg-program-row__meta">{t('profile.homeText')}</span>
            </span>
          </Link>
        )}
        <ProgramForm templates={templates} />
        <Link href="/exercises?tab=mine" className="mg-program-row">
          <span className="mg-program-row__text">
            <span className="mg-program-row__name">{t('home.myExercises', { n: custom })}</span>
            <span className="mg-program-row__meta">{t('home.myExercisesHint')}</span>
          </span>
        </Link>
        <h2 className="mg-body-section-title">{t('home.programs')}</h2>
        <ProgramList programs={programs} />
        <StartSessionButton workoutId={null} label={t('home.freeWorkout')} variant="subtle" />
      </div>
    </>
  );
}
