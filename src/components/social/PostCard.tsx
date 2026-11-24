import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Globe2, MessageCircle, Users } from 'lucide-react';
import type { PostView } from '@/lib/social/server';
import { Avatar } from './Avatar';
import { LikeButton } from './LikeButton';
import { PostMenu } from './PostMenu';
import { WorkoutAttachment } from './WorkoutAttachment';
import { PostCarousel } from './PostCarousel';
import { EditorialSlide } from './EditorialSlide';

/** "há 5 min", "há 2 h", "ontem"… a partir de agora. */
export function relTime(iso: string, locale: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 7 * 86400) return rtf.format(Math.round(diff / 86400), 'day');
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(iso));
}

/** Um post: autor, quando, para quem, texto, treino partilhado, gostos e comentários. */
export function PostCard({ post, locale, link = true }: { post: PostView; locale: string; link?: boolean }) {
  const t = useTranslations('social.post');
  const Vis = post.visibility === 'PUBLIC' ? Globe2 : Users;
  return (
    <article className="mg-post" aria-label={t('by', { name: post.author.displayName })}>
      <header className="mg-post__head">
        <Link href={`/u/${post.author.handle}`} className="mg-post__author">
          <Avatar name={post.author.displayName} url={post.author.avatarUrl} />
          <span className="mg-post__who">
            <span className="mg-post__name">{post.author.displayName}</span>
            <span className="mg-post__meta">
              @{post.author.handle} · {relTime(post.createdAt, locale)} ·{' '}
              <Vis size={12} strokeWidth={2} aria-label={t(`visibility.${post.visibility}`)} />
            </span>
          </span>
        </Link>
        <PostMenu postId={post.id} mine={post.mine} />
      </header>
      {post.hidden && <p className="mg-post__hidden">{t('hidden')}</p>}
      {post.text && <p className="mg-post__text">{post.text}</p>}
      {/* Carrossel: a primeira foto na capa, o slide editorial a seguir e as outras fotos depois. */}
      {post.carousel && post.workout ? (
        <PostCarousel>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mg-carousel__photo" src={post.images[0]} alt="" loading="lazy" />
          <EditorialSlide workout={post.workout} locale={locale} author={post.author.displayName} />
          {post.images.slice(1).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} className="mg-carousel__photo" src={src} alt="" loading="lazy" />
          ))}
        </PostCarousel>
      ) : post.images.length > 0 && (
        <div className={`mg-post__photos mg-post__photos--${post.images.length}`}>
          {post.images.map((src) => (
            <a key={src} href={src} target="_blank" rel="noreferrer" className="mg-post__photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {post.workout && !post.carousel && <WorkoutAttachment workout={post.workout} locale={locale} />}
      <footer className="mg-post__actions">
        <LikeButton postId={post.id} liked={post.liked} count={post.likes} />
        {link ? (
          <Link href={`/p/${post.id}`} className="mg-post__action" aria-label={t('comments', { n: post.comments })}>
            <MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />
            {post.comments > 0 && <span>{post.comments}</span>}
          </Link>
        ) : (
          <span className="mg-post__action" aria-label={t('comments', { n: post.comments })}>
            <MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />
            {post.comments > 0 && <span>{post.comments}</span>}
          </span>
        )}
      </footer>
    </article>
  );
}
