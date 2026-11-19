'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { answerFriend, blockUser, removeFriend, requestFriend } from '@/actions/social';
import type { Relationship } from '@/lib/social/rules';
import { Button } from '@/components/ui/Button';
import { ReportDialog } from './ReportDialog';

/** No perfil de outra pessoa: amizade (pedir, cancelar, aceitar, desfazer), bloquear e denunciar. */
export function ProfileActions({ userId, rel, friendshipId }: { userId: string; rel: Relationship; friendshipId: string | null }) {
  const t = useTranslations('social.profile');
  const te = useTranslations();
  const router = useRouter();
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, confirm?: string) =>
    start(async () => {
      if (confirm && !window.confirm(confirm)) return;
      const res = await fn();
      if (!res.ok && res.error) return setError(te(res.error));
      router.refresh();
    });
  if (rel === 'self') return null;
  return (
    <div className="mg-profile-actions">
      {rel === 'none' && (
        <Button loading={pending} onClick={() => run(() => requestFriend(userId))}>
          {t('add')}
        </Button>
      )}
      {rel === 'outgoing' && (
        <Button variant="ghost" loading={pending} onClick={() => run(() => removeFriend(userId))}>
          {t('cancel')}
        </Button>
      )}
      {rel === 'incoming' && friendshipId && (
        <>
          <Button loading={pending} onClick={() => run(() => answerFriend(friendshipId, true))}>
            {t('accept')}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => run(() => answerFriend(friendshipId, false))}>
            {t('decline')}
          </Button>
        </>
      )}
      {rel === 'friends' && (
        <Button variant="ghost" loading={pending} onClick={() => run(() => removeFriend(userId), t('removeConfirm'))}>
          {t('remove')}
        </Button>
      )}
      {rel === 'blocked' ? (
        <Button variant="ghost" loading={pending} onClick={() => run(() => blockUser(userId, false))}>
          {t('unblock')}
        </Button>
      ) : (
        <Button variant="subtle" disabled={pending} onClick={() => run(() => blockUser(userId, true), t('blockConfirm'))}>
          {t('block')}
        </Button>
      )}
      <Button variant="subtle" disabled={pending} onClick={() => setReporting(true)}>
        {t('report')}
      </Button>
      {reporting && <ReportDialog target="USER" targetId={userId} onClose={() => setReporting(false)} />}
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
