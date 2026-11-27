'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { updateFitnessPrefs } from '@/actions/fitness';
import { CheckChip } from '@/components/ui/CheckChip';

/** Definições › Notificações: avisar quando um amigo treinar (ligado por defeito). */
export function FriendWorkoutsToggle({ initial }: { initial: boolean }) {
  const t = useTranslations('settings');
  const [on, setOn] = useState(initial);
  const [, start] = useTransition();
  return (
    <CheckChip
      icon="bell"
      label={t('friendWorkouts')}
      checked={on}
      onCheckedChange={(v) => {
        setOn(v);
        start(async () => void (await updateFitnessPrefs({ notifyFriendWorkouts: v })));
      }}
    />
  );
}
