import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { getPost } from '@/lib/social/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { Avatar } from '@/components/social/Avatar';
import { PostCard, relTime } from '@/components/social/PostCard';
import { CommentActions, CommentForm } from '@/components/social/CommentForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social');
  return { title: t('postTitle') };
}

/** Um post com os comentários. */
export default async function PostPage({ params }: { params: { id: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, data] = await Promise.all([getTranslations('social'), getPost(userId, params.id)]);
  if (!data) notFound();
  return (
    <>
      <BodyHeader title={t('postTitle')} backHref="/feed" backLabel={t('feed')} historyBack />
      <div className="mg-body-shell__main">
        <PostCard post={data.post} locale={locale} link={false} />
        <h2 className="mg-body-section-title">{t('comments.title', { n: data.comments.length })}</h2>
        {data.comments.length > 0 && (
          <ul className="mg-comments">
            {data.comments.map((c) => (
              <li key={c.id} className="mg-comment">
                <Link href={`/u/${c.author.handle}`} aria-label={c.author.displayName}>
                  <Avatar name={c.author.displayName} url={c.author.avatarUrl} size={32} />
                </Link>
                <div className="mg-comment__body">
                  <p className="mg-comment__meta">
                    <Link href={`/u/${c.author.handle}`}>{c.author.displayName}</Link> · {relTime(c.createdAt, locale)}
                  </p>
                  <p className="mg-comment__text">{c.text}</p>
                  <CommentActions commentId={c.id} canDelete={c.mine || data.post.mine} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <CommentForm postId={data.post.id} />
      </div>
    </>
  );
}
