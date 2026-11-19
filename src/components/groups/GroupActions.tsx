'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { joinGroup, leaveGroup, removeMember } from '@/actions/groups';
import { Button } from '@/components/ui/Button';

/** Entrar, sair, ou partilhar o link de convite de um grupo. */
export function GroupActions({ groupId, code, member, owner, joinable }: { groupId: string; code: string | null; member: boolean; owner: boolean; joinable: boolean }) {
  const t = useTranslations('groups');
  const te = useTranslations();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const link = code ? `${typeof window === 'undefined' ? '' : window.location.origin}/groups/join/${code}` : '';
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: t('inviteTitle'), url: link });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      /* cancelado */
    }
  };
  return (
    <div className="mg-profile-actions">
      {!member && joinable && (
        <Button
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await joinGroup({ groupId });
              if (!res.ok) return setError(te(res.error));
              router.refresh();
            })
          }
        >
          {t('join')}
        </Button>
      )}
      {member && code && (
        <Button variant="ghost" onClick={() => void share()}>
          {copied ? t('copied') : t('invite')}
        </Button>
      )}
      {member && !owner && (
        <Button
          variant="subtle"
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (!window.confirm(t('leaveConfirm'))) return;
              await leaveGroup(groupId);
              router.push('/groups');
              router.refresh();
            })
          }
        >
          {t('leave')}
        </Button>
      )}
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** O dono tira alguém do grupo. */
export function RemoveMemberButton({ groupId, userId }: { groupId: string; userId: string }) {
  const t = useTranslations('groups');
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="mg-comment__link"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!window.confirm(t('removeConfirm'))) return;
          await removeMember(groupId, userId);
          router.refresh();
        })
      }
    >
      {t('remove')}
    </button>
  );
}

/** Entrar pelo link de convite. */
export function JoinByCode({ code }: { code: string }) {
  const t = useTranslations('groups');
  const te = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        block
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await joinGroup({ code });
            if (!res.ok) return setError(te(res.error));
            router.push(`/groups/${res.data.id}`);
          })
        }
      >
        {t('join')}
      </Button>
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
