import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';

/** Só a página de entrada, o blog e os documentos legais são indexáveis; o app e a API ficam fora. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/start', '/blog', '/privacy', '/terms'],
      disallow: ['/'],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
