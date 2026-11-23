import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.offline');
  return { title: t('title') };
}

/** Sem rede e sem esta página guardada no dispositivo: o service worker guarda esta página ao instalar e mostra-a. */
export default async function OfflinePage() {
  const t = await getTranslations('common.offline');
  return (
    <section className="mg-goodbye">
      <span className="mg-goodbye__icon">
        <MagicIcon name="dumbbell" size="lg" decorative />
      </span>
      <h1 className="mg-goodbye__title">{t('title')}</h1>
      <p className="mg-goodbye__text">{t('text')}</p>
      {/* Link normal (não <Link>): recarrega a página inteira quando a rede voltar. */}
      <a href="/" className="mg-btn mg-btn--ghost">
        {t('retry')}
      </a>
    </section>
  );
}
