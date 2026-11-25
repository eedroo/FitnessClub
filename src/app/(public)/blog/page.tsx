import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { isAppLocale } from '@/i18n/locales';
import { formatLongDate, type DateISO } from '@/lib/dates';
import { listPosts } from '@/lib/blog/content';

export async function generateMetadata(): Promise<Metadata> {
  const [t, tc] = await Promise.all([getTranslations('blog'), getTranslations('common')]);
  return { title: t('title'), description: t('lead'), openGraph: { title: `${t('title')} · ${tc('appName')}`, description: t('lead') } };
}

/** Blog público (captação): todos os artigos, do mais recente. */
export default async function BlogPage() {
  const [t, raw] = await Promise.all([getTranslations('blog'), getLocale()]);
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const posts = listPosts(locale);
  return (
    <article className="mg-legal">
      <h1>{t('title')}</h1>
      <p>{t('lead')}</p>
      {posts.length ? (
        <ul className="mg-blog-list">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="mg-blog-card">
                <span className="mg-blog-card__date">
                  {formatLongDate(p.date as DateISO, locale)} · {t('minutes', { n: p.minutes })}
                </span>
                <span className="mg-blog-card__title">{p.title}</span>
                <span className="mg-blog-card__desc">{p.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t('empty')}</p>
      )}
    </article>
  );
}
