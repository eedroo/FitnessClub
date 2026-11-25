import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { LandingPage } from '@/components/start/LandingPage';
import { PublicAnalytics } from '@/components/providers/PublicAnalytics';
import { AmbientBackground } from '@/components/shell/AmbientBackground';

export async function generateMetadata(): Promise<Metadata> {
  const [t, tl] = await Promise.all([getTranslations('common'), getTranslations('landing')]);
  return {
    title: { absolute: `${t('appName')} · ${tl('heroTitle')}` },
    description: tl('heroLead'),
    openGraph: { title: t('appName'), description: tl('heroLead'), images: ['/icons/icon-512.png'] },
  };
}

/** Entrada pública (landing do beta): quem abre o app sem sessão vem aqui (o middleware redirecciona `/`). Com sessão, vai para os treinos. */
export default async function StartPage() {
  const session = await auth();
  if (session?.user) redirect('/');
  return (
    <>
      <AmbientBackground />
      <LandingPage />
      <PublicAnalytics />
    </>
  );
}
