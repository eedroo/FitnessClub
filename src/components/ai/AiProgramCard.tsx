import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';

/**
 * Em Treinos, logo a seguir ao nível: o programa feito pela IA em destaque (azul da IA). Sem o recurso `ai` mostra o
 * mesmo cartão com "Premium", sem ligação; com a IA indisponível, o aviso.
 */
export async function AiProgramCard({ feature, available }: { feature: boolean; available: boolean }) {
  const t = await getTranslations();
  const body = (
    <>
      <span className="mg-ai-hero__icon" aria-hidden="true">
        <MagicIcon name="sparkles" size="md" decorative />
      </span>
      <span className="mg-ai-card__text">
        <span className="mg-ai-hero__title">{t('ai.hero.title')}</span>
        <span className="mg-ai-card__meta">
          {available ? t('ai.hero.text') : feature ? t('fitness.programs.withAiUnavailable') : t('fitness.programs.withAiPremium')}
        </span>
      </span>
      {available ? (
        <span className="mg-ai-hero__cta">{t('ai.hero.cta')}</span>
      ) : (
        !feature && <span className="mg-ai-card__badge">{t('ai.program.premiumBadge')}</span>
      )}
    </>
  );
  return available ? (
    <Link href="/ai/new" className="mg-ai-hero" data-tour="ai">
      {body}
    </Link>
  ) : (
    <div className="mg-ai-hero" data-tour="ai" aria-disabled="true">
      {body}
    </div>
  );
}
