import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Dumbbell, Scale, Timer, Trophy, type LucideIcon } from 'lucide-react';

const FEATURES: { key: 'programs' | 'sessions' | 'records' | 'weight'; icon: LucideIcon }[] = [
  { key: 'programs', icon: Dumbbell },
  { key: 'sessions', icon: Timer },
  { key: 'records', icon: Trophy },
  { key: 'weight', icon: Scale },
];

/**
 * Página de entrada (primeira visita, sem sessão), no padrão do ecrã de boas-vindas das apps do iPhone: ícone, título,
 * o que o app faz em quatro linhas com ícones de cor e, fixos em baixo, "Criar conta" e "Já tenho conta".
 */
export async function StartScreen() {
  const [t, tc] = await Promise.all([getTranslations('start'), getTranslations('common')]);
  return (
    <main className="mg-start" id="main">
      <div className="mg-start__content">
        {/* eslint-disable-next-line @next/next/no-img-element -- ícone do app, estático e pequeno */}
        <img className="mg-start__icon" src="/icons/apple-touch-icon.png" alt="" width={96} height={96} />
        <h1 className="mg-start__title">{t('title', { app: tc('appName') })}</h1>
        <ul className="mg-start__features">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li key={key} className={`mg-start__feature mg-start__feature--${key}`}>
              <span className="mg-start__feature-icon" aria-hidden="true">
                <Icon size={28} strokeWidth={2} />
              </span>
              <span className="mg-start__feature-text">
                <strong className="mg-start__feature-title">{t(`features.${key}.title`)}</strong>
                <span className="mg-start__feature-body">{t(`features.${key}.body`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mg-start__actions">
        <p className="mg-start__privacy">
          {t('privacy')} <Link href="/privacy">{t('privacyLink')}</Link>
        </p>
        <Link href="/register" className="mg-btn mg-btn--primary mg-btn--block">
          {t('register')}
        </Link>
        <Link href="/login" className="mg-btn mg-btn--subtle mg-btn--block">
          {t('login')}
        </Link>
      </div>
    </main>
  );
}
