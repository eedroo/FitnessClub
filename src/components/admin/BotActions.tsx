'use client';

import { useState, useTransition } from 'react';
import { botAction, type BotAction } from '@/actions/admin';
import { Button } from '@/components/ui/Button';

/** Botões dos bots (criar, rodar o dia, ocultar/mostrar, apagar). Área interna, só PT-PT. */
export function BotActions({ count, visible }: { count: number; visible: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (a: BotAction, confirm?: string) =>
    start(async () => {
      if (confirm && !window.confirm(confirm)) return;
      const r = await botAction(a);
      setMsg(r.ok ? r.message : r.error);
    });
  return (
    <div className="mg-admin-form">
      <div className="mg-form__row">
        {count === 0 ? (
          <Button className="mg-btn--body" loading={pending} onClick={() => run('create')}>
            Criar os bots
          </Button>
        ) : visible ? (
          <>
            <Button className="mg-btn--body" loading={pending} onClick={() => run('run')}>
              Rodar o dia agora
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => run('hide', 'Ocultar os bots? Saem do feed, perfis, pesquisa e ranking e deixam de treinar.')}>
              Ocultar os bots
            </Button>
          </>
        ) : (
          <Button className="mg-btn--body" loading={pending} onClick={() => run('show')}>
            Mostrar os bots outra vez
          </Button>
        )}
        {count > 0 && (
          <Button variant="danger" disabled={pending} onClick={() => run('delete', 'Apagar os bots de vez, com treinos e publicações?')}>
            Apagar
          </Button>
        )}
      </div>
      {msg && <p className="mg-admin__note">{msg}</p>}
    </div>
  );
}
