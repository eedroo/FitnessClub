'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { toggleLike } from '@/actions/social';

/** Gosto (optimista): coração cheio quando gostei, com a contagem. */
export function LikeButton({ postId, liked: initial, count: initialCount }: { postId: string; liked: boolean; count: number }) {
  const t = useTranslations('social.post');
  const [liked, setLiked] = useState(initial);
  const [count, setCount] = useState(initialCount);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      className={liked ? 'mg-post__action mg-post__action--liked' : 'mg-post__action'}
      aria-pressed={liked}
      aria-label={liked ? t('unlike') : t('like')}
      onClick={() => {
        setLiked(!liked);
        setCount(count + (liked ? -1 : 1));
        start(async () => {
          const res = await toggleLike(postId);
          if (!res.ok) {
            setLiked(liked);
            setCount(count);
          }
        });
      }}
    >
      <Heart size={20} strokeWidth={1.75} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
