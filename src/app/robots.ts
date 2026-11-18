import type { MetadataRoute } from 'next';

/** Só a página de entrada e os documentos legais são indexáveis; o app e a API ficam fora. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/start', '/privacy', '/terms'],
      disallow: ['/'],
    },
  };
}
