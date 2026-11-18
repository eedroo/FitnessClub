import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { getEntitlements } from '@/lib/entitlements/server';
import { PremiumLock } from '@/components/premium/PremiumLock';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('premium');
  return { title: t('lockTitle') };
}

/** Sem o recurso `pro`: o cadeado, com as definições à mão (exportar, apagar a conta, sair). */
export default async function LockedPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if ((await getEntitlements(session.user.id)).features.pro) redirect('/');
  const [t, ts] = await Promise.all([getTranslations('premium'), getTranslations('shell')]);
  return (
    <main className="mg-auth" id="main">
      <PremiumLock title={t('lockTitle')} teaser={t('lockText')} />
      <p className="mg-auth__footer">
        <Link href="/settings">{ts('settings')}</Link>
      </p>
    </main>
  );
}
