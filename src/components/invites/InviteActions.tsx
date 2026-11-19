'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { answerInvite, askToJoin, cancelInvite, decideRequest, leaveInvite } from '@/actions/invites';
import { Button } from '@/components/ui/Button';

type Status = 'INVITED' | 'REQUESTED' | 'GOING' | 'DECLINED' | null;

/** Acções num convite: quero ir, responder ao convite, deixar de ir, ou (anfitrião) cancelar. */
export function InviteActions({ inviteId, mine, status, canceled, past, canAsk }: { inviteId: string; mine: boolean; status: Status; canceled: boolean; past: boolean; canAsk: boolean }) {
  const t = useTranslations('invites.actions');
  const te = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, confirm?: string) =>
    start(async () => {
      if (confirm && !window.confirm(confirm)) return;
      const res = await fn();
      if (!res.ok && res.error) return setError(te(res.error));
      router.refresh();
    });
  if (canceled || past) return null;
  return (
    <div className="mg-profile-actions">
      {mine ? (
        <Button variant="danger" loading={pending} onClick={() => run(() => cancelInvite(inviteId), t('cancelConfirm'))}>
          {t('cancel')}
        </Button>
      ) : status === 'INVITED' ? (
        <>
          <Button loading={pending} onClick={() => run(() => answerInvite(inviteId, true))}>
            {t('accept')}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => run(() => answerInvite(inviteId, false))}>
            {t('decline')}
          </Button>
        </>
      ) : status === 'GOING' ? (
        <Button variant="ghost" loading={pending} onClick={() => run(() => leaveInvite(inviteId))}>
          {t('leave')}
        </Button>
      ) : status === 'REQUESTED' ? (
        <Button variant="ghost" loading={pending} onClick={() => run(() => leaveInvite(inviteId))}>
          {t('withdraw')}
        </Button>
      ) : (
        canAsk && (
          <Button loading={pending} onClick={() => run(() => askToJoin(inviteId))}>
            {t('ask')}
          </Button>
        )
      )}
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** O anfitrião aceita ou recusa um pedido. */
export function RequestButtons({ inviteId, userId }: { inviteId: string; userId: string }) {
  const t = useTranslations('invites.actions');
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (accept: boolean) =>
    start(async () => {
      await decideRequest(inviteId, userId, accept);
      router.refresh();
    });
  return (
    <span className="mg-profile-actions">
      <Button loading={pending} onClick={() => go(true)}>
        {t('approve')}
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => go(false)}>
        {t('reject')}
      </Button>
    </span>
  );
}
