'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { addComment, deleteComment } from '@/actions/social';
import { Button } from '@/components/ui/Button';
import { ReportDialog } from './ReportDialog';

/** Escrever um comentário. */
export function CommentForm({ postId }: { postId: string }) {
  const t = useTranslations('social.comments');
  const te = useTranslations();
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mg-comment-form">
      <textarea className="mg-input mg-composer__text" rows={2} maxLength={500} placeholder={t('placeholder')} value={text} onChange={(e) => setText(e.target.value)} />
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <Button
        loading={pending}
        disabled={!text.trim()}
        onClick={() =>
          start(async () => {
            const res = await addComment(postId, text);
            if (!res.ok) return setError(te(res.error));
            setText('');
            setError(null);
            router.refresh();
          })
        }
      >
        {t('send')}
      </Button>
    </div>
  );
}

/** Acções de um comentário: apagar (meu ou no meu post) ou denunciar. */
export function CommentActions({ commentId, canDelete }: { commentId: string; canDelete: boolean }) {
  const t = useTranslations('social.comments');
  const router = useRouter();
  const [reporting, setReporting] = useState(false);
  const [pending, start] = useTransition();
  if (reporting) return <ReportDialog target="COMMENT" targetId={commentId} onClose={() => setReporting(false)} />;
  return (
    <span className="mg-comment__actions">
      {canDelete ? (
        <button
          type="button"
          className="mg-comment__link"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await deleteComment(commentId);
              router.refresh();
            })
          }
        >
          {t('delete')}
        </button>
      ) : (
        <button type="button" className="mg-comment__link" onClick={() => setReporting(true)}>
          {t('report')}
        </button>
      )}
    </span>
  );
}
