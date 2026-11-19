'use client';

import { useState, useTransition } from 'react';
import { sendTestNotification } from '@/actions/push';

/** Envia a notificação de teste para os dispositivos desta conta e diz quantos a receberam. */
export function PushTestButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mg-admin-form">
      <button
        type="button"
        className="mg-btn mg-btn--ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await sendTestNotification();
            if (!r.ok) return setMsg('Não foi possível enviar (limite de 3 por hora ou sessão expirada).');
            if (!r.configured) return setMsg('As chaves VAPID ainda não estão na Vercel (ou falta um novo deploy).');
            if (!r.devices) return setMsg('Este utilizador não tem dispositivos com notificações activas. Activa-as nas definições do app.');
            setMsg(`Enviada para ${r.sent} de ${r.devices} dispositivo(s).`);
          })
        }
      >
        Enviar notificação de teste
      </button>
      {msg && <p className="mg-admin__note">{msg}</p>}
    </div>
  );
}
