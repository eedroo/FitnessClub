'use client';

import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';

interface PremiumLockProps {
  title: string;
  /** Texto curto que não revela o conteúdo. */
  teaser: string;
}

/** Cadeado premium: sem preços nem compra (o acesso é dado no admin). */
export function PremiumLock({ title, teaser }: PremiumLockProps) {
  const t = useTranslations('premium');
  return (
    <section className="mg-premium-lock" aria-label={t('lockLabel')}>
      <span className="mg-premium-lock__icon" aria-hidden="true">
        <Lock size={24} strokeWidth={1.75} />
      </span>
      <h2 className="mg-premium-lock__title">{title}</h2>
      <p className="mg-premium-lock__text">{teaser}</p>
    </section>
  );
}
