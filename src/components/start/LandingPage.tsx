import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import {
  Activity,
  BookOpen,
  Dumbbell,
  Medal,
  Scale,
  Sparkles,
  Timer,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { isAppLocale } from '@/i18n/locales';
import { formatLongDate, type DateISO } from '@/lib/dates';
import { listPosts } from '@/lib/blog/content';

const FEATURES: { key: string; icon: LucideIcon }[] = [
  { key: 'programs', icon: Dumbbell },
  { key: 'ai', icon: Sparkles },
  { key: 'sessions', icon: Timer },
  { key: 'progress', icon: TrendingUp },
  { key: 'library', icon: BookOpen },
  { key: 'activities', icon: Activity },
  { key: 'game', icon: Medal },
  { key: 'community', icon: Users },
  { key: 'body', icon: Scale },
];
const HOW = ['one', 'two', 'three'] as const;
const FAQ = ['free', 'store', 'offline', 'data', 'ai', 'ranking', 'languages', 'beta'] as const;
const CONTACT = 'privacidade@onda.work';

/**
 * Página de entrada pública (beta): o que o app faz, como começar, como instalar, perguntas frequentes, os últimos
 * artigos do blog e as ligações legais. Quem já tem sessão vai direto para o app.
 */
export async function LandingPage() {
  const [t, tc, raw] = await Promise.all([getTranslations('landing'), getTranslations('common'), getLocale()]);
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const posts = listPosts(locale).slice(0, 3);
  return (
    <main className="mg-landing" id="main">
      <header className="mg-landing__bar">
        <span className="mg-landing__brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- ícone do app, estático e pequeno */}
          <img src="/icons/apple-touch-icon.png" alt="" width={32} height={32} />
          {tc('appName')}
        </span>
        <nav className="mg-landing__nav">
          <Link href="/blog">{t('footer.blog')}</Link>
          <Link href="/login" className="mg-btn mg-btn--subtle">
            {t('login')}
          </Link>
        </nav>
      </header>

      <section className="mg-landing__hero">
        <span className="mg-landing__beta">{t('beta')}</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- ícone do app */}
        <img className="mg-landing__icon" src="/icons/apple-touch-icon.png" alt="" width={112} height={112} />
        <h1 className="mg-landing__title">{t('heroTitle')}</h1>
        <p className="mg-landing__lead">{t('heroLead')}</p>
        <div className="mg-landing__ctas">
          <Link href="/register" className="mg-btn mg-btn--primary">
            {t('cta')}
          </Link>
          <Link href="/login" className="mg-btn mg-btn--subtle">
            {t('login')}
          </Link>
        </div>
        <p className="mg-landing__note">{t('free')}</p>
      </section>

      <section className="mg-landing__section" aria-labelledby="landing-features">
        <h2 id="landing-features" className="mg-landing__h2">
          {t('featuresTitle')}
        </h2>
        <p className="mg-landing__sub">{t('featuresLead')}</p>
        <ul className="mg-landing__features">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li key={key} className={`mg-landing__feature${key === 'ai' ? ' mg-landing__feature--ai' : ''}`}>
              <span className="mg-landing__feature-icon" aria-hidden="true">
                <Icon size={24} strokeWidth={2} />
              </span>
              <h3 className="mg-landing__h3">{t(`features.${key}.title`)}</h3>
              <p className="mg-landing__text">{t(`features.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mg-landing__section" aria-labelledby="landing-how">
        <h2 id="landing-how" className="mg-landing__h2">
          {t('howTitle')}
        </h2>
        <ol className="mg-landing__steps">
          {HOW.map((k, i) => (
            <li key={k} className="mg-landing__step">
              <span className="mg-landing__step-num" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mg-landing__h3">{t(`how.${k}.title`)}</h3>
              <p className="mg-landing__text">{t(`how.${k}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mg-landing__section" aria-labelledby="landing-install">
        <h2 id="landing-install" className="mg-landing__h2">
          {t('installTitle')}
        </h2>
        <p className="mg-landing__sub">{t('installLead')}</p>
        <div className="mg-landing__install">
          {(['ios', 'android'] as const).map((k) => (
            <div key={k} className="mg-landing__card">
              <h3 className="mg-landing__h3">{t(`install.${k}.title`)}</h3>
              <p className="mg-landing__text">{t(`install.${k}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mg-landing__section" aria-labelledby="landing-faq">
        <h2 id="landing-faq" className="mg-landing__h2">
          {t('faqTitle')}
        </h2>
        <div className="mg-landing__faq">
          {FAQ.map((k) => (
            <details key={k} className="mg-landing__qa">
              <summary>{t(`faq.${k}.q`)}</summary>
              <p className="mg-landing__text">{t(`faq.${k}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      {posts.length > 0 && (
        <section className="mg-landing__section" aria-labelledby="landing-blog">
          <h2 id="landing-blog" className="mg-landing__h2">
            {t('blogTitle')}
          </h2>
          <ul className="mg-blog-list">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="mg-blog-card">
                  <span className="mg-blog-card__date">{formatLongDate(p.date as DateISO, locale)}</span>
                  <span className="mg-blog-card__title">{p.title}</span>
                  <span className="mg-blog-card__desc">{p.description}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/blog" className="mg-landing__more">
            {t('blogMore')}
          </Link>
        </section>
      )}

      <section className="mg-landing__final">
        <h2 className="mg-landing__h2">{t('finalTitle')}</h2>
        <p className="mg-landing__sub">{t('finalLead')}</p>
        <Link href="/register" className="mg-btn mg-btn--primary">
          {t('cta')}
        </Link>
      </section>

      <footer className="mg-landing__footer">
        <nav className="mg-landing__links">
          <Link href="/terms">{t('footer.terms')}</Link>
          <Link href="/privacy">{t('footer.privacy')}</Link>
          <Link href="/blog">{t('footer.blog')}</Link>
          <a href={`mailto:${CONTACT}`}>{t('footer.contact')}</a>
        </nav>
        <p className="mg-landing__note">© {new Date().getFullYear()} {tc('appName')}</p>
      </footer>
    </main>
  );
}
