import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { getTrainingProfile } from '@/lib/fitness/queries';
import { toProfileData } from '@/lib/fitness/profile';
import { getAiAccess } from '@/lib/ai/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { AiProgramWizard } from '@/components/ai/AiProgramWizard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ai.wizard');
  return { title: t('title') };
}

/** Novo programa com IA: as perguntas desta vez (sugeridas com as respostas da última). */
export default async function AiNewProgramPage() {
  const { userId } = await bodyPage();
  const [t, tf, access, profile] = await Promise.all([
    getTranslations('ai'),
    getTranslations('fitness'),
    getAiAccess(userId),
    getTrainingProfile(userId),
  ]);
  return (
    <>
      <BodyHeader title={t('wizard.title')} backHref="/" backLabel={tf('nav.workouts')} />
      <div className="mg-body-shell__main">
        {access.feature && access.configured ? (
          <AiProgramWizard initial={toProfileData(profile)} consent={access.consent} />
        ) : (
          <p className="mg-ai-program__desc">{access.feature ? t('errors.unavailable') : t('program.premium')}</p>
        )}
      </div>
    </>
  );
}
