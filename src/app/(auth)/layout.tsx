import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { PublicAnalytics } from '@/components/providers/PublicAnalytics';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('common');
  return (
    <>
      <AmbientBackground />
      <main className="mg-auth">
        <div className="mg-auth__brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- ícone do app, estático e pequeno */}
          <img className="mg-auth__appicon" src="/icons/apple-touch-icon.png" alt="" width={88} height={88} />
          <p className="mg-auth__wordmark">{t('appName')}</p>
          <p className="mg-auth__tagline">{t('tagline')}</p>
        </div>
        {children}
      </main>
      <PublicAnalytics />
    </>
  );
}
