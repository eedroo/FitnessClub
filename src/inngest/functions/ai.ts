import { inngest } from '../client';
import { db } from '@/lib/db';
import { dueInsights, runInsight, runProgramRequest } from '@/lib/ai/server';
import { reportJobFailure } from '../sentry';

/** Programa pedido pela pessoa (Fase B). Uma tentativa extra; se falhar de vez, o pedido fica FAILED. */
export const aiProgram = inngest.createFunction(
  {
    id: 'ai-program',
    retries: 1,
    concurrency: { limit: 5 },
    onFailure: async (ctx) => {
      const requestId = (ctx.event.data.event.data as { requestId?: string }).requestId;
      if (requestId)
        await db.aiRequest.updateMany({ where: { id: requestId, status: 'PENDING' }, data: { status: 'FAILED', error: 'job falhou', finishedAt: new Date() } });
      await reportJobFailure('ai-program')(ctx);
    },
  },
  { event: 'ai/program.requested' },
  async ({ event, step }) => step.run('generate', () => runProgramRequest(event.data.requestId)),
);

/** Retrospectiva de uma semana (automática ao domingo ou pedida na app). */
export const aiInsight = inngest.createFunction(
  { id: 'ai-insight', retries: 1, concurrency: { limit: 5 }, onFailure: reportJobFailure('ai-insight') },
  { event: 'ai/insight.requested' },
  async ({ event, step }) => step.run('generate', () => runInsight(event.data.userId, event.data.weekStart, { notify: true })),
);

/** De hora a hora: a quem é domingo às 9h, pede a retrospectiva da semana que acabou. */
export const aiInsightCron = inngest.createFunction(
  { id: 'ai-insight-cron', retries: 1, onFailure: reportJobFailure('ai-insight-cron') },
  { cron: '0 * * * *' },
  async ({ step }) => {
    const due = await step.run('due', () => dueInsights());
    if (due.length) await step.sendEvent('fan-out', due.map((d) => ({ name: 'ai/insight.requested' as const, data: d })));
    return { sent: due.length };
  },
);
