import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';

/** Início (provisório até os treinos chegarem à raiz). */
export default async function HomePage() {
  const t = await getTranslations();
  return (
    <main className="mg-auth">
      <GlassCard className="mg-auth__card" title={t('common.appName')}>
        <p>{t('common.comingSoonBody')}</p>
      </GlassCard>
    </main>
  );
}
