'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { answerFriend } from '@/actions/social';
import { Button } from '@/components/ui/Button';

/** Aceitar ou recusar um pedido de amizade na lista. */
export function FriendRequestButtons({ friendshipId }: { friendshipId: string }) {
  const t = useTranslations('social.profile');
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (accept: boolean) =>
    start(async () => {
      await answerFriend(friendshipId, accept);
      router.refresh();
    });
  return (
    <span className="mg-profile-actions">
      <Button loading={pending} onClick={() => go(true)}>
        {t('accept')}
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => go(false)}>
        {t('decline')}
      </Button>
    </span>
  );
}
