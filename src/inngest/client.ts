import { EventSchemas, Inngest } from 'inngest';

/** Cliente Inngest (jobs em segundo plano — nunca num request de página). */
type Events = {
  // Descanso iniciado numa sessão de treino (o job dorme até ao fim e decide o push).
  'fitness/rest.started': { data: { userId: string; sessionId: string; restEndsAt: string } };
};

export const inngest = new Inngest({ id: 'fitnessclub', schemas: new EventSchemas().fromRecord<Events>() });

export type FitnessRestEvent = { name: 'fitness/rest.started'; data: Events['fitness/rest.started']['data'] };

/**
 * Envia eventos sem nunca falhar o request que os disparou (best-effort; sem Inngest configurado em
 * desenvolvimento, só regista o aviso; com o dev server local usar `INNGEST_DEV=1`).
 */
export async function sendSafely(events: FitnessRestEvent[]): Promise<boolean> {
  if (!events.length) return true;
  if (!process.env.INNGEST_EVENT_KEY && !process.env.INNGEST_DEV) {
    console.warn('[inngest] Sem INNGEST_EVENT_KEY nem INNGEST_DEV: eventos não enviados.');
    return false;
  }
  try {
    await inngest.send(events);
    return true;
  } catch (err) {
    console.warn('[inngest] Falha ao enviar eventos:', err instanceof Error ? err.message : err);
    return false;
  }
}
