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
import { NavTracker } from '@/components/providers/NavTracker';
import { Suspense } from 'react';
import { EntitlementsProvider } from '@/components/premium/EntitlementsProvider';
import { VerifyEmailBanner } from '@/components/account/VerifyEmailBanner';
import { PolicyUpdateDialog } from '@/components/account/PolicyUpdateDialog';
import { OfflineBanner } from '@/components/providers/OfflineBanner';
import { PendingSync } from '@/components/providers/PendingSync';
import { WeighInPrompt } from '@/components/body/WeighInPrompt';
import { AppTour } from '@/components/body/AppTour';
import { weighInPeriod } from '@/lib/body/weighIn';
import { fromDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { formatGramsAsKg } from '@/lib/weight';

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
      select: { lastActiveAt: true, timezone: true, emailVerifiedAt: true, termsVersion: true, privacyVersion: true, wellbeingConsentAt: true },
    }),
    getEntitlements(session.user.id),
  ]);
  // Termos/Política: versão nova (ou nunca aceite) → diálogo bloqueante.
  const legal = legalVersions();
  const policyPending = !!user && (user.termsVersion !== legal.terms || user.privacyVersion !== legal.privacy);
  // Tour de boas-vindas (uma vez por conta) e lembrete de pesagem (diário ou semanal, só com o consentimento de dados
  // de saúde). Nunca os dois na mesma abertura nem por cima dos Termos; só com o recurso `pro`.
  let weighIn: { period: DateISO; today: DateISO; weekly: boolean; lastKg: string } | null = null;
  let showTour = false;
  if (user && entitlements.features.pro && !policyPending) {
    const [prefs, last] = await Promise.all([
      db.fitnessPrefs.findUnique({ where: { userId: session.user.id }, select: { weighInFrequency: true, tourDoneAt: true } }),
      user.wellbeingConsentAt
        ? db.bodyWeightEntry.findFirst({ where: { userId: session.user.id }, orderBy: { date: 'desc' }, select: { date: true, grams: true } })
        : null,
    ]);
    showTour = !prefs?.tourDoneAt;
    const freq = prefs?.weighInFrequency ?? 'OFF';
    const today = todayInTz(user.timezone);
    const period = user.wellbeingConsentAt && !showTour ? weighInPeriod(freq, today, last ? fromDbDate(last.date) : null) : null;
    if (period) weighIn = { period, today, weekly: freq === 'WEEKLY', lastKg: last ? formatGramsAsKg(last.grams, 'pt-PT') : '' };
  }
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
      <Suspense fallback={null}>
        <NavTracker />
      </Suspense>
      <EntitlementsProvider value={entitlements}>
        <OfflineBanner />
        <PendingSync />
        {weighIn && <WeighInPrompt {...weighIn} />}
        {showTour && <AppTour />}
        <VerifyEmailBanner verified={!user || user.emailVerifiedAt !== null} />
        {children}
        {policyPending && <PolicyUpdateDialog askWellbeing={!user?.wellbeingConsentAt} />}
      </EntitlementsProvider>
    </>
  );
}
