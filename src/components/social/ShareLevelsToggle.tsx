'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { setShareLevels } from '@/actions/social';
import { CheckChip } from '@/components/ui/CheckChip';

/** Mostrar os níveis de força no perfil público (desligado por defeito). */
export function ShareLevelsToggle({ initial }: { initial: boolean }) {
  const t = useTranslations('social.edit');
  const [on, setOn] = useState(initial);
  const [, start] = useTransition();
  return (
    <CheckChip
      icon="trophy"
      label={t('shareLevels')}
      checked={on}
      onCheckedChange={(v) => {
        setOn(v);
        start(async () => void (await setShareLevels(v)));
      }}
    />
  );
}
