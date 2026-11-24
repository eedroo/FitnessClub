'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { setInRanking } from '@/actions/social';
import { CheckChip } from '@/components/ui/CheckChip';

/** Aparecer no ranking semanal por ligas (ligado por defeito). */
export function RankingToggle({ initial }: { initial: boolean }) {
  const t = useTranslations('ranking');
  const [on, setOn] = useState(initial);
  const [, start] = useTransition();
  return (
    <CheckChip
      icon="trophy"
      label={t('toggle')}
      checked={on}
      onCheckedChange={(v) => {
        setOn(v);
        start(async () => void (await setInRanking(v)));
      }}
    />
  );
}
