'use client';

import { useState } from 'react';

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/**
 * Gera um par de chaves VAPID (P-256) neste dispositivo, com a Web Crypto do browser. Nada é enviado ao servidor:
 * as chaves só aparecem aqui para copiar para a Vercel. Formato igual ao `npx web-push generate-vapid-keys`.
 */
export function VapidGenerator() {
  const [keys, setKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    try {
      const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
      const pub = new Uint8Array([4, ...fromB64url(jwk.x!), ...fromB64url(jwk.y!)]);
      setKeys({ publicKey: b64url(pub), privateKey: jwk.d! });
      setError(null);
    } catch {
      setError('Este browser não consegue gerar as chaves. Tenta noutro (Safari, Chrome).');
    }
  };

  return (
    <div className="mg-admin-form">
      <button type="button" className="mg-btn mg-btn--primary" onClick={generate}>
        {keys ? 'Gerar outro par' : 'Gerar chaves'}
      </button>
      {error && <p className="mg-admin__note">{error}</p>}
      {keys && (
        <>
          <label className="mg-admin-form__field">
            NEXT_PUBLIC_VAPID_PUBLIC_KEY
            <input readOnly value={keys.publicKey} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <label className="mg-admin-form__field">
            VAPID_PRIVATE_KEY (secreta: só na Vercel)
            <input readOnly value={keys.privateKey} onFocus={(e) => e.currentTarget.select()} />
          </label>
        </>
      )}
    </div>
  );
}
