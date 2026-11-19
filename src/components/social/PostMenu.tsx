'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MoreHorizontal } from 'lucide-react';
import { deletePost } from '@/actions/social';
import { ReportDialog } from './ReportDialog';

/** "…" de um post: apagar (meu) ou denunciar (dos outros). */
export function PostMenu({ postId, mine }: { postId: string; mine: boolean }) {
  const t = useTranslations('social.post');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="mg-post__menu">
      <button type="button" className="mg-post__action" aria-label={t('more')} aria-expanded={open} onClick={() => setOpen(!open)}>
        <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && !reporting && (
        <div className="mg-post__menu-list" role="menu">
          {mine ? (
            <button
              type="button"
              role="menuitem"
              className="mg-post__menu-item mg-post__menu-item--danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  if (!window.confirm(t('deleteConfirm'))) return;
                  await deletePost(postId);
                  router.refresh();
                })
              }
            >
              {t('delete')}
            </button>
          ) : (
            <button type="button" role="menuitem" className="mg-post__menu-item" onClick={() => setReporting(true)}>
              {t('report')}
            </button>
          )}
        </div>
      )}
      {reporting && (
        <ReportDialog
          target="POST"
          targetId={postId}
          onClose={() => {
            setReporting(false);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
