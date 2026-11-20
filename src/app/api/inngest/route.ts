import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { fitnessRestAlert } from '@/inngest/functions/fitnessRestAlert';
import { aiInsight, aiInsightCron, aiProgram } from '@/inngest/functions/ai';

/** Endpoint do Inngest (assinado com INNGEST_SIGNING_KEY em produção). */
// Os pedidos à IA podem levar mais de um minuto (programas completos): até 5 min por passo.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [fitnessRestAlert, aiProgram, aiInsight, aiInsightCron],
});
