import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { fitnessRestAlert } from '@/inngest/functions/fitnessRestAlert';
import { aiInsight, aiInsightCron, aiProgram } from '@/inngest/functions/ai';

/** Endpoint do Inngest (assinado com INNGEST_SIGNING_KEY em produção). */
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [fitnessRestAlert, aiProgram, aiInsight, aiInsightCron],
});
