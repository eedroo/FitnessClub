import { inngest } from '../client';
import { runBotsDay } from '@/lib/bots/server';
import { reportJobFailure } from '../sentry';

/**
 * Bots (contas de demonstração), todos os dias às 20h de Brasília: cada um, ao acaso e ao seu ritmo, faz o treino
 * seguinte com a progressão dupla e às vezes publica. Parado enquanto estiverem ocultos no admin.
 */
export const botsDaily = inngest.createFunction(
  { id: 'bots-daily', retries: 1, onFailure: reportJobFailure('bots-daily') },
  { cron: 'TZ=America/Sao_Paulo 0 20 * * *' },
  async ({ step }) => step.run('run', () => runBotsDay()),
);
