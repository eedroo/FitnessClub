'use client';

import { useState, useTransition } from 'react';
import { sendRankingAnnouncement } from '@/actions/admin';
import { Button } from '@/components/ui/Button';

/** Anúncio do ranking semanal por push (confirmação antes; enviar só uma vez). Área interna, só PT-PT. */
export function RankingAnnounceButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mg-admin-form">
      <Button
        variant="ghost"
        loading={pending}
        onClick={() =>
          start(async () => {
            if (!window.confirm('Enviar o anúncio do ranking a todas as pessoas com notificações? Envia só uma vez.')) return;
            const r = await sendRankingAnnouncement();
            setMsg(r.ok ? `Enviado a ${r.people} pessoa(s), ${r.sent} dispositivo(s).` : r.error);
          })
        }
      >
        Anunciar o ranking semanal
      </Button>
      {msg && <p className="mg-admin__note">{msg}</p>}
    </div>
  );
}
