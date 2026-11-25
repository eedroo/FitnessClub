import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs/config';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Fotos de perfil e das publicações no Vercel Blob (store público) pelo next/image.
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }] },
  // src/instrumentation.ts valida o env no arranque (Next 14 precisa desta flag).
  experimental: {
    instrumentationHook: true,
    // Os documentos legais e o blog lêem content/ do disco no servidor: incluir os ficheiros no bundle das funções.
    outputFileTracingIncludes: { '/**': ['./content/legal/**/*', './content/blog/**/*'] },
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

// Sentry (erros). Pedidos do browser passam por /monitoring (não são bloqueados por ad-blockers);
// source maps só são enviados quando existe SENTRY_AUTH_TOKEN (build na Vercel).
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: '/monitoring',
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
