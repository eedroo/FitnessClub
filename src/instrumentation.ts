import * as Sentry from '@sentry/nextjs';

/**
 * Arranque do servidor: liga o Sentry (só com SENTRY_DSN) e, em produção, valida a env (Zod) e regista um erro
 * claro se faltar algo. Não impede o arranque: sem estas chaves o app funciona sem push, emails ou jobs.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('../sentry.server.config');
  if (process.env.NEXT_RUNTIME === 'edge') await import('../sentry.edge.config');

  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    const { assertEnv } = await import('./lib/env');
    try {
      assertEnv();
    } catch (err) {
      console.error(err instanceof Error ? err.message : err, '— push, emails e jobs desligados até serem configurados.');
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
