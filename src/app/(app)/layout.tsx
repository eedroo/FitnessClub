import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { legalVersions } from '@/lib/env';
import { touchActivity } from '@/lib/activity';
import { getEntitlements } from '@/lib/entitlements/server';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { ThemeSync } from '@/components/providers/ThemeSync';
import { SentryUser } from '@/components/providers/SentryUser';
import { AccentSync } from '@/components/providers/AccentSync';
import { accentOrDefault } from '@/lib/accent';
import { EntitlementsProvider } from '@/components/premium/EntitlementsProvider';
import { VerifyEmailBanner } from '@/components/account/VerifyEmailBanner';
import { PolicyUpdateDialog } from '@/components/account/PolicyUpdateDialog';

/** Tudo o que precisa de sessão e de boas-vindas concluídas: treinos, definições. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  // Sem sessão aqui = token invalidado (sessionVersion mudou ou conta apagada): /api/session/end limpa o cookie.
  if (!session?.user) redirect('/api/session/end');
  if (!session.user.onboarded) redirect('/welcome');

  const [t, user, entitlements] = await Promise.all([
    getTranslations(),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { lastActiveAt: true, timezone: true, emailVerifiedAt: true, termsVersion: true, privacyVersion: true, wellbeingConsentAt: true, accent: true },
    }),
    getEntitlements(session.user.id),
  ]);
  // Termos/Política: versão nova (ou nunca aceite) → diálogo bloqueante.
  const legal = legalVersions();
  const policyPending = !!user && (user.termsVersion !== legal.terms || user.privacyVersion !== legal.privacy);
  // Um registo por dia em que a pessoa abre o app (métricas do admin). Sem esperar.
  if (user) touchActivity(session.user.id, user.timezone, user.lastActiveAt);

  return (
    <>
      <a href="#main" className="mg-visually-hidden">
        {t('common.skipToContent')}
      </a>
      <AmbientBackground />
      <ThemeSync theme={session.user.theme} />
      <SentryUser id={session.user.id} />
      <AccentSync accent={accentOrDefault(user?.accent)} />
      <EntitlementsProvider value={entitlements}>
        <VerifyEmailBanner verified={!user || user.emailVerifiedAt !== null} />
        {children}
        {policyPending && <PolicyUpdateDialog askWellbeing={!user?.wellbeingConsentAt} />}
      </EntitlementsProvider>
    </>
  );
}
