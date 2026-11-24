import { inngest } from '../client';
import { closeLeagueWeek, notifyLeagueWeek } from '@/lib/social/ranking';
import { shiftWeek, weekStartOf } from '@/lib/weeks';
import { todayInTz } from '@/lib/dates';
import { reportJobFailure } from '../sentry';

/**
 * Ranking por ligas, ao domingo às 12h UTC (9h no Brasil, 12h em Portugal): a semana anterior já acabou para toda a
 * gente. Fecha-a (grava o pódio de cada liga) e envia os avisos: vitória aos do pódio, "nova semana" aos outros.
 */
export const leagueWeekly = inngest.createFunction(
  { id: 'league-weekly', retries: 1, onFailure: reportJobFailure('league-weekly') },
  { cron: 'TZ=UTC 0 12 * * 0' },
  async ({ step }) => {
    const weekStart = shiftWeek(weekStartOf(todayInTz('UTC')), -1);
    const winners = await step.run('close', () => closeLeagueWeek(weekStart));
    const { sent } = await step.run('notify', () => notifyLeagueWeek(winners));
    return { weekStart, winners: winners.length, sent };
  },
);
