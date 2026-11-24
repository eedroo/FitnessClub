'use client';

import type { SetInput } from '@/lib/fitness/types';

/** Séries por enviar (sem rede): guardadas no dispositivo com o id e a hora reais, reenviadas ao voltar a rede. */
export interface QueuedSet extends SetInput {
  id: string;
  completedAt: string;
}

const key = (sessionId: string) => `mg-fitness-queue:${sessionId}`;

export function readQueue(sessionId: string): QueuedSet[] {
  try {
    const raw = window.localStorage.getItem(key(sessionId));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as QueuedSet[]) : [];
  } catch {
    return [];
  }
}

export function writeQueue(sessionId: string, list: QueuedSet[]): void {
  try {
    if (list.length) window.localStorage.setItem(key(sessionId), JSON.stringify(list));
    else window.localStorage.removeItem(key(sessionId));
  } catch {
    // armazenamento indisponível: a série fica só em memória
  }
}

/** Id compatível com o servidor (minúsculas e dígitos, 24 caracteres). */
export function newSetId(): string {
  const bytes = new Uint8Array(15);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('').padEnd(24, '0').slice(0, 24);
}

type SessionOp = { op: 'set'; set: QueuedSet } | { op: 'hidden'; hidden: boolean } | { op: 'notes'; notes: string } | { op: 'end'; endedAt: string };

/**
 * Escritas de fundo da sessão pela rota `/api/fitness/sessions/[id]`. Sem rede devolve `null` e nunca lança:
 * uma Server Action falhada a voltar do segundo plano deixava a app no ecrã de erro.
 * `beacon` (ao esconder a app) usa `sendBeacon`, que o browser entrega mesmo com a página a ser suspensa.
 */
export async function postSession<T = { ok: boolean; error?: string }>(sessionId: string, body: SessionOp, beacon = false): Promise<T | null> {
  const url = `/api/fitness/sessions/${encodeURIComponent(sessionId)}`;
  const payload = JSON.stringify(body);
  try {
    if (beacon && typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url, payload)) return null;
    const res = await fetch(url, { method: 'POST', body: payload, keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok && res.status >= 500) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** A app está à vista e com rede (para refrescar dados do servidor sem arriscar um erro). */
export const canSync = () => typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine !== false;

// ─── Fim sem rede ────────────────────────────────────────────────────────────────────────────────

const endKey = (sessionId: string) => `mg-fitness-end:${sessionId}`;

/** Treino terminado sem rede: a hora real fica no dispositivo até ser enviada. */
export function readEnd(sessionId: string): string | null {
  try {
    return window.localStorage.getItem(endKey(sessionId));
  } catch {
    return null;
  }
}

export function writeEnd(sessionId: string, endedAt: string | null): void {
  try {
    if (endedAt) window.localStorage.setItem(endKey(sessionId), endedAt);
    else window.localStorage.removeItem(endKey(sessionId));
  } catch {
    // armazenamento indisponível
  }
}

/** Sessões com algo por enviar neste dispositivo (séries na fila ou o fim). */
export function pendingSessionIds(): string[] {
  const ids = new Set<string>();
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i) ?? '';
      const m = /^mg-fitness-(?:queue|end):(.+)$/.exec(k);
      if (m?.[1]) ids.add(m[1]);
    }
  } catch {
    // sem armazenamento
  }
  return [...ids];
}

type EndResult = { ok: true; data: { id: string; next: string } } | { ok: false; error: string };

/**
 * Envia o que uma sessão tem por enviar: as séries da fila (pela ordem) e depois o fim, se foi terminada sem rede.
 * Devolve `null` sem rede (fica tudo para a próxima), senão o resultado do fim (ou `{ ok: true }` sem fim pendente).
 * Repetir é seguro: cada série tem o id do dispositivo e o fim com hora é idempotente.
 */
export async function syncSession(sessionId: string): Promise<EndResult | { ok: true; data: null } | null> {
  for (const q of readQueue(sessionId)) {
    const res = await postSession(sessionId, { op: 'set', set: q });
    if (!res) return null;
    // Enviada (ou recusada de vez): sai da fila.
    writeQueue(sessionId, readQueue(sessionId).filter((x) => x.id !== q.id));
  }
  const endedAt = readEnd(sessionId);
  if (!endedAt) return { ok: true, data: null };
  const res = await postSession<EndResult>(sessionId, { op: 'end', endedAt });
  if (!res) return null;
  writeEnd(sessionId, null);
  return res;
}
