import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { StartScreen } from '@/components/start/StartScreen';
import { PublicAnalytics } from '@/components/providers/PublicAnalytics';
import { AmbientBackground } from '@/components/shell/AmbientBackground';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return { title: { absolute: t('appName') }, description: t('description') };
}

/** Entrada pública: quem abre o app sem sessão vem aqui (o middleware redirecciona `/`). Com sessão, vai para os treinos. */
export default async function StartPage() {
  const session = await auth();
  if (session?.user) redirect('/');
  return (
    <>
      <AmbientBackground />
      <StartScreen />
      <PublicAnalytics />
    </>
  );
}
