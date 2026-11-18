import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';

/** Endpoint do Inngest (assinado com INNGEST_SIGNING_KEY em produção). */
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [],
});
