import { z } from 'zod';

/**
 * Variáveis de ambiente, validadas com Zod. Se faltar alguma, o arranque regista um erro claro
 * (ver `src/instrumentation.ts`) mas o app continua a funcionar: push, emails e jobs degradam.
 */
/** Web Push. Gerar com `npx web-push generate-vapid-keys`. */
const pushEnvSchema = z.object({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().regex(/^(mailto:|https:\/\/)/),
});

/** Email transaccional: Resend. Sem chave em desenvolvimento/teste os emails ficam em memória. */
const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(3),
  EMAIL_REPLY_TO: z.string().email(),
});

/** URL pública e versões dos documentos legais. */
const appEnvSchema = z.object({
  APP_URL: z.string().url(),
  LEGAL_TERMS_VERSION: z.string().min(1),
  LEGAL_PRIVACY_VERSION: z.string().min(1),
});

// Operação. Tudo opcional: sem DSN o Sentry fica desligado; sem ADMIN_EMAILS ninguém é admin.
const optionalUrl = z.union([z.literal(''), z.string().url()]).optional();
const opsEnvSchema = z.object({
  SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  ADMIN_EMAILS: z.string().optional(),
});

const envSchema = pushEnvSchema.merge(emailEnvSchema).merge(appEnvSchema).merge(opsEnvSchema).extend({
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
});

export type AppEnv = z.infer<typeof envSchema>;
export type PushEnv = z.infer<typeof pushEnvSchema>;
export type EmailEnv = z.infer<typeof emailEnvSchema>;

let cached: AppEnv | null = null;
let cachedPush: PushEnv | null = null;

function parseEnv<S extends z.ZodTypeAny>(schema: S): z.output<S> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`[env] Variáveis de ambiente em falta ou inválidas: ${missing}`);
  }
  return parsed.data;
}

/** Toda a configuração (push, email, Inngest, Upstash). Lança com a lista de variáveis em falta. */
export function getEnv(): AppEnv {
  cached ??= parseEnv(envSchema);
  return cached;
}

/** Só as chaves VAPID (envio de push). */
export function getPushEnv(): PushEnv {
  cachedPush ??= parseEnv(pushEnvSchema);
  return cachedPush;
}

/** Configuração do Resend. */
export function getEmailEnv(): EmailEnv {
  return parseEnv(emailEnvSchema);
}

/** Há Resend configurado? (sem ele, fora de produção, os emails ficam em memória e na consola) */
export function hasEmail(): boolean {
  return emailEnvSchema.safeParse(process.env).success;
}

/** URL pública da app (links nos emails), sem barra final. */
/** Sem APP_URL nem AUTH_URL, na Vercel usa o domínio de produção do projecto (variável de sistema da Vercel). */
export function appUrl(): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
  return (process.env.APP_URL || process.env.AUTH_URL || vercel || 'http://localhost:3000').replace(/\/+$/, '');
}

/** Versões actuais dos Termos e da Política de Privacidade (re-aceitação quando mudam). */
/** A versão do código (a dos ficheiros em `content/legal`) ganha a uma variável mais antiga na Vercel. */
export const DEFAULT_LEGAL_VERSION = '2026-11-19.3';
const newest = (env: string | undefined) => (env && env > DEFAULT_LEGAL_VERSION ? env : DEFAULT_LEGAL_VERSION);
export function legalVersions(): { terms: string; privacy: string } {
  return { terms: newest(process.env.LEGAL_TERMS_VERSION), privacy: newest(process.env.LEGAL_PRIVACY_VERSION) };
}

/** Há chaves VAPID para enviar push? (sem elas não sai nenhum aviso) */
export function hasPush(): boolean {
  return pushEnvSchema.safeParse(process.env).success;
}

/** Lança se faltar configuração; chamado no arranque do servidor em produção. */
export function assertEnv(): void {
  getEnv();
}

/** Há Upstash configurado (rate limit)? */
export function hasUpstash(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
