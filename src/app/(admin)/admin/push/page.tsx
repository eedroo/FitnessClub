import { hasPush } from '@/lib/env';
import { GlassCard } from '@/components/ui/GlassCard';
import { VapidGenerator } from '@/components/admin/VapidGenerator';
import { PushTestButton } from '@/components/admin/PushTestButton';

/** Notificações push: estado, gerar as chaves VAPID neste dispositivo e enviar um teste. */
export default function AdminPushPage() {
  const configured = hasPush();
  const eventKey = Boolean(process.env.INNGEST_EVENT_KEY);
  const signingKey = Boolean(process.env.INNGEST_SIGNING_KEY);
  const inngest = eventKey && signingKey;
  return (
    <>
      <h1 className="mg-admin__title">Notificações</h1>
      <GlassCard title="Estado">
        <p className="mg-admin__note">Chaves VAPID (push): {configured ? 'configuradas ✓' : 'em falta'}</p>
        <p className="mg-admin__note">Inngest (aviso de fim de descanso e IA): {inngest ? 'configurado ✓' : 'em falta'}</p>
        {!inngest && (
          <p className="mg-admin__note">
            INNGEST_EVENT_KEY: {eventKey ? 'ok ✓' : 'em falta'} · INNGEST_SIGNING_KEY: {signingKey ? 'ok ✓' : 'em falta'} (ambiente:{' '}
            {process.env.VERCEL_ENV ?? 'local'}). As variáveis só valem depois de um Redeploy.
          </p>
        )}
      </GlassCard>
      {!configured && (
        <GlassCard title="1. Gerar as chaves VAPID">
          <p className="mg-admin__note">
            As chaves são geradas neste dispositivo e não passam pelo servidor. Copia cada uma para a Vercel (Settings → Environment
            Variables, tipo Secret) e acrescenta VAPID_SUBJECT = mailto:o-teu-email. Depois faz Redeploy. Gera só uma vez: mudar as chaves
            obriga a reactivar as notificações em todos os dispositivos.
          </p>
          <VapidGenerator />
        </GlassCard>
      )}
      <GlassCard title={configured ? 'Testar' : '2. Testar (depois do Redeploy)'}>
        <PushTestButton />
      </GlassCard>
    </>
  );
}
