import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';
import { listPosts } from '@/lib/blog/content';

/** Páginas públicas indexáveis: a entrada, o blog (cada artigo) e os documentos legais. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return [
    { url: `${base}/start`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    ...listPosts('pt-PT').map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.date, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
