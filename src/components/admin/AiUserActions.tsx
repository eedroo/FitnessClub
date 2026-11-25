'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { aiUserAction } from '@/actions/admin';
import { Button } from '@/components/ui/Button';

/** Na ficha de uma pessoa: repor as tentativas de programa com IA e gerar de novo. Área interna, só PT-PT. */
export function AiUserActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (a: 'reset' | 'retry') =>
    start(async () => {
      const r = await aiUserAction(userId, a);
      setMsg(r.ok ? r.message : r.error);
      router.refresh();
    });
  return (
    <div className="mg-admin-form">
      <div className="mg-form__row">
        <Button className="mg-btn--body" loading={pending} onClick={() => run('retry')}>
          Gerar de novo
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => run('reset')}>
          Repor tentativas
        </Button>
      </div>
      {msg && <p className="mg-admin__note">{msg}</p>}
    </div>
  );
}
