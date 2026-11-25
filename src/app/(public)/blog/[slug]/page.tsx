import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { isAppLocale } from '@/i18n/locales';
import { formatLongDate, type DateISO } from '@/lib/dates';
import { getPost } from '@/lib/blog/content';
import { Block } from '@/components/legal/LegalPage';

async function load(slug: string) {
  const raw = await getLocale();
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  return { post: getPost(slug, locale), locale };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { post } = await load(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: { type: 'article', title: post.title, description: post.description, publishedTime: post.date, images: ['/icons/icon-512.png'] },
  };
}

/** Um artigo do blog, com o convite para experimentar o app no fim. */
export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { post, locale } = await load(params.slug);
  if (!post) notFound();
  const t = await getTranslations('blog');
  return (
    <article className="mg-legal">
      <p className="mg-blog-post__meta">
        <Link href="/blog">{t('back')}</Link> · {formatLongDate(post.date as DateISO, locale)} · {t('minutes', { n: post.minutes })}
      </p>
      <h1>{post.title}</h1>
      {post.blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
      <aside className="mg-blog-cta">
        <p className="mg-blog-cta__title">{t('cta')}</p>
        <p>{t('ctaLead')}</p>
        <Link href="/register" className="mg-btn mg-btn--primary">
          {t('cta')}
        </Link>
      </aside>
    </article>
  );
}
