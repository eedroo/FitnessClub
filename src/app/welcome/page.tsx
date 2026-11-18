import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { getFitnessPrefs } from '@/lib/fitness/queries';
import { FITNESS_TEMPLATES } from '@/lib/fitness/templates';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { ThemeSync } from '@/components/providers/ThemeSync';
import { BodyWelcome } from '@/components/body/BodyWelcome';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('welcome');
  return { title: t('title') };
}

/** Boas-vindas (onboarding) depois do registo: o middleware traz aqui quem ainda não as concluiu. */
export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.onboarded) redirect('/');
  const [t, tc, prefs] = await Promise.all([getTranslations('fitness'), getTranslations('common'), getFitnessPrefs(session.user.id)]);
  return (
    <>
      <AmbientBackground />
      <ThemeSync theme={session.user.theme} />
      <div className="mg-body-shell" id="main">
        {/* Sem "voltar": até concluir, o middleware traz sempre aqui. */}
        <header className="mg-body-header">
          <h1 className="mg-body-header__title">{tc('appName')}</h1>
        </header>
        <div className="mg-body-shell__main">
          <BodyWelcome
            initialRest={prefs.defaultRestSec}
            templates={FITNESS_TEMPLATES.map((tpl) => ({ id: tpl.id, name: t(`templates.${tpl.id}.name`), description: t(`templates.${tpl.id}.description`) }))}
          />
        </div>
      </div>
    </>
  );
}
