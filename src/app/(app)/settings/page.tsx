import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { logout } from '@/actions/auth';
import { signOutEverywhere } from '@/actions/account';
import { PageHeader } from '@/components/shell/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SettingsForm } from '@/components/forms/SettingsForm';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { TrainingPrefsForm } from '@/components/settings/TrainingPrefsForm';
import { ChangeEmailForm } from '@/components/account/ChangeEmailForm';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { ResendVerificationButton } from '@/components/account/ResendVerificationButton';
import { WellbeingConsentCard } from '@/components/account/WellbeingConsentCard';
import { AiSettingsCard } from '@/components/ai/AiSettingsCard';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';
import { NotificationsPromptCard } from '@/components/notifications/NotificationsPromptCard';
import { InstallButton } from '@/components/notifications/InstallButton';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { DELETE_CONFIRM_WORD } from '@/lib/validation/account';
import { getEntitlements } from '@/lib/entitlements/server';
import { getFitnessPrefs, getTrainingProfile } from '@/lib/fitness/queries';
import { toProfileData } from '@/lib/fitness/profile';
import { intlLocale, isAppLocale } from '@/i18n/locales';
import { isAdminEmail } from '@/lib/admin';

const SECTIONS = ['profile', 'account', 'preferences', 'trainingProfile', 'training', 'notifications', 'privacy', 'sessions', 'danger'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings');
  return { title: t('title') };
}

function supportedTimezones(current: string): string[] {
  const list = Intl.supportedValuesOf('timeZone');
  return list.includes(current) ? list : [current, ...list];
}

/** Definições: perfil, conta, preferências, treino (só com `pro`), avisos, privacidade, sessões e apagar a conta. */
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const [t, tAuth, ta, tf, tp, entitlements, locale, user, profileRow] = await Promise.all([
    getTranslations('settings'),
    getTranslations('auth'),
    getTranslations('account'),
    getTranslations('fitness'),
    getTranslations('fitness.profile'),
    getEntitlements(session.user.id),
    getLocale(),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, locale: true, theme: true, timezone: true, emailVerifiedAt: true, wellbeingConsentAt: true, aiConsentAt: true, fitnessPrefs: { select: { aiWeeklyInsights: true } } },
    }),
    getTrainingProfile(session.user.id),
  ]);
  const profile = toProfileData(profileRow);
  const profileSummary = [
    profile.goals.map((g) => tp(`goals.${g}`)).join(', '),
    tp(`levels.${profile.level}.name`),
    profile.trainingDays.length ? tp('steps.days.count', { n: profile.trainingDays.length }) : '',
  ].filter(Boolean).join(' · ');
  if (!user) redirect('/login');

  const pro = entitlements.features.pro;
  const prefs = pro ? await getFitnessPrefs(session.user.id) : null;
  const sections = SECTIONS.filter((id) => id !== 'training' || pro);
  const intl = intlLocale(isAppLocale(locale) ? locale : 'pt-PT');
  const consentedOn = user.wellbeingConsentAt
    ? new Intl.DateTimeFormat(intl, { dateStyle: 'long', timeZone: user.timezone }).format(user.wellbeingConsentAt)
    : null;
  const aiConsentedOn = user.aiConsentAt
    ? new Intl.DateTimeFormat(intl, { dateStyle: 'long', timeZone: user.timezone }).format(user.aiConsentAt)
    : null;
  const formInitial = { name: user.name, locale: user.locale, theme: user.theme, timezone: user.timezone };
  const timezones = supportedTimezones(user.timezone);

  return (
    <main className="mg-shell__main" id="main">
      <p className="mg-settings__back">
        <Link href={pro ? '/' : '/locked'} className="mg-btn mg-btn--subtle">
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          {tf('title')}
        </Link>
      </p>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="mg-settings">
        <SettingsNav label={t('sections.label')} sections={sections.map((id) => ({ id, label: t(`sections.${id}`) }))} />
        <div className="mg-settings__sections">
          {/* Só para admins (ADMIN_EMAILS): abrir a administração no telemóvel, sem escrever /admin. */}
          {isAdminEmail(session.user.email) && (
            <GlassCard id="admin" className="mg-settings__section" title={t('admin.title')}>
              <div className="mg-form">
                <p className="mg-form__status">{t('admin.text')}</p>
                <Link href="/admin" className="mg-btn mg-btn--primary mg-btn--block">
                  {t('admin.open')}
                </Link>
              </div>
            </GlassCard>
          )}
          <GlassCard id="profile" className="mg-settings__section" title={t('sections.profile')} header={entitlements.plan === 'PREMIUM' ? <PremiumBadge /> : undefined}>
            <SettingsForm part="profile" initial={formInitial} timezones={timezones} />
          </GlassCard>

          <GlassCard id="account" className="mg-settings__section" title={t('sections.account')}>
            <div className="mg-form">
              <dl className="mg-dl">
                <dt>{t('email')}</dt>
                <dd>
                  {user.email}{' '}
                  <span className={user.emailVerifiedAt ? 'mg-form__status mg-form__status--ok' : 'mg-form__status'}>
                    {user.emailVerifiedAt ? ta('email.verified') : ta('email.unverified')}
                  </span>
                </dd>
              </dl>
              {!user.emailVerifiedAt && (
                <div className="mg-banner__actions">
                  <ResendVerificationButton />
                </div>
              )}
              <hr className="mg-form__divider" />
              <ChangeEmailForm />
              <hr className="mg-form__divider" />
              <ChangePasswordForm />
            </div>
          </GlassCard>

          <GlassCard id="preferences" className="mg-settings__section" title={t('sections.preferences')}>
            <SettingsForm part="preferences" initial={formInitial} timezones={timezones} />
          </GlassCard>

          <GlassCard id="trainingProfile" className="mg-settings__section" title={t('sections.trainingProfile')}>
            <div className="mg-form">
              <p className="mg-form__status">{profileRow ? profileSummary : tp('empty')}</p>
              <div className="mg-form__row">
                <Link href="/training-profile" className="mg-btn mg-btn--ghost">
                  {profileRow ? tp('edit') : tp('create')}
                </Link>
              </div>
            </div>
          </GlassCard>

          {prefs && (
            <GlassCard id="training" className="mg-settings__section" title={t('sections.training')}>
              <TrainingPrefsForm
                initial={{ defaultRestSec: prefs.defaultRestSec, restAlert: prefs.restAlert, keepAwake: prefs.keepAwake, weighInFrequency: prefs.weighInFrequency }}
                hasConsent={!!user.wellbeingConsentAt}
              />
            </GlassCard>
          )}

          <GlassCard id="notifications" className="mg-settings__section" title={t('sections.notifications')}>
            <div className="mg-form">
              <p className="mg-form__status">{t('notificationsHint')}</p>
              <NotificationsPromptCard />
              <InstallButton />
            </div>
          </GlassCard>

          <GlassCard id="privacy" className="mg-settings__section" title={t('sections.privacy')}>
            <div className="mg-form">
              <WellbeingConsentCard consentedOn={consentedOn} />
              <hr className="mg-form__divider" />
              <AiSettingsCard consentedOn={aiConsentedOn} feature={entitlements.features.ai} weekly={user.fitnessPrefs?.aiWeeklyInsights ?? true} />
              <hr className="mg-form__divider" />
              <div className="mg-form">
                <h3 className="mg-form__title">{ta('export.title')}</h3>
                <p className="mg-form__status">{ta('export.text')}</p>
                <div className="mg-form__row">
                  <a href="/api/account/export" download className="mg-btn mg-btn--ghost">
                    {ta('export.button')}
                  </a>
                </div>
              </div>
              <hr className="mg-form__divider" />
              <p className="mg-form__row">
                <Link href="/privacy">{ta('links.privacy')}</Link>
                <Link href="/terms">{ta('links.terms')}</Link>
              </p>
            </div>
          </GlassCard>

          <GlassCard id="sessions" className="mg-settings__section" title={t('sections.sessions')}>
            <div className="mg-form">
              <p className="mg-form__status">{ta('sessions.text')}</p>
              <div className="mg-form__row">
                <form action={logout}>
                  <Button type="submit" variant="ghost">
                    {tAuth('logout')}
                  </Button>
                </form>
                <form action={signOutEverywhere}>
                  <Button type="submit" variant="subtle">
                    {ta('sessions.button')}
                  </Button>
                </form>
              </div>
            </div>
          </GlassCard>

          <GlassCard id="danger" className="mg-settings__section" title={t('sections.danger')}>
            <DeleteAccountDialog confirmWord={DELETE_CONFIRM_WORD[user.locale]} />
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
