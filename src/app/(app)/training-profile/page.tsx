import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { getTrainingProfile } from '@/lib/fitness/queries';
import { toProfileData } from '@/lib/fitness/profile';
import { BodyHeader } from '@/components/body/BodyHeader';
import { TrainingProfileForm } from '@/components/profile/TrainingProfileForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness.profile');
  return { title: t('title') };
}

/** Perfil de treino (objectivos, nível, equipamento, músculos em foco, dias, pedidos): o que a IA vai usar. */
export default async function TrainingProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const [t, ts, profile, user] = await Promise.all([
    getTranslations('fitness.profile'),
    getTranslations('shell'),
    getTrainingProfile(session.user.id),
    db.user.findUnique({ where: { id: session.user.id }, select: { wellbeingConsentAt: true } }),
  ]);
  return (
    <div className="mg-body-shell" id="main">
      <BodyHeader title={t('title')} backHref="/settings" backLabel={ts('settings')} />
      <div className="mg-body-shell__main">
        <p className="mg-body-welcome__text">{t('intro')}</p>
        <TrainingProfileForm initial={toProfileData(profile)} weightAllowed={!!user?.wellbeingConsentAt} />
      </div>
    </div>
  );
}
