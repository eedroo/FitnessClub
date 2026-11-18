import type { MetadataRoute } from 'next';

/** Só os documentos legais são indexáveis; o app e a API ficam fora. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/privacy', '/terms'],
      disallow: ['/'],
    },
  };
}
