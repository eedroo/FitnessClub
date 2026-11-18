import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { WelcomeStart } from '@/components/welcome/WelcomeStart';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('welcome');
  return { title: t('title') };
}

/** Boas-vindas depois do registo (o middleware traz aqui quem ainda não as concluiu). */
export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.onboarded) redirect('/');
  const t = await getTranslations('welcome');
  return (
    <>
      <AmbientBackground />
      <main className="mg-auth" id="main">
        <GlassCard className="mg-auth__card" variant="accent" title={t('title')}>
          <p>{t('text')}</p>
          <WelcomeStart label={t('start')} />
        </GlassCard>
      </main>
    </>
  );
}
