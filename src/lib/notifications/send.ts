import 'server-only';
import webpush, { WebPushError } from 'web-push';
import { db } from '@/lib/db';
import { getPushEnv, hasPush } from '@/lib/env';
import { notificationBadgeUrl } from '@/lib/icons';
import type { NotificationContent } from './content';

/** Envio de avisos por Web Push a todos os dispositivos do utilizador. */

const TTL_SECONDS = 4 * 60 * 60;
let configured = false;

function configure(): void {
  if (configured) return;
  const env = getPushEnv();
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
}

export interface PushPayload extends NotificationContent {
  tag: string;
  /** Id do registo: o service worker devolve-o ao tocar (`/api/notifications/opened`). */
  id?: string;
}

/** Envia a todos os dispositivos do utilizador; apaga subscrições expiradas (404/410). Devolve quantos receberam. */
/** `ttl` em segundos (o aviso de fim de descanso só vale 60 s). */
export async function pushToUser(userId: string, payload: PushPayload, opts: { ttl?: number } = {}): Promise<number> {
  if (!hasPush()) return 0;
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return 0;
  configure();

  const body = JSON.stringify({ ...payload, icon: '/icons/icon-192.png', badge: notificationBadgeUrl() });
  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: opts.ttl ?? TTL_SECONDS,
        });
        return true;
      } catch (err) {
        const status = err instanceof WebPushError ? err.statusCode : undefined;
        if (status === 404 || status === 410) {
          await db.pushSubscription.deleteMany({ where: { id: s.id } });
        } else {
          console.warn(`[push] Falha a enviar para ${new URL(s.endpoint).host}:`, status ?? (err instanceof Error ? err.message : err));
        }
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
}
