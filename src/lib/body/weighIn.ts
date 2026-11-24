import type { DateISO } from '@/lib/dates';
import { compareDates } from '@/lib/dates';
import { weekStartOf } from '@/lib/weeks';

export type WeighInFrequency = 'OFF' | 'DAILY' | 'WEEKLY';

/**
 * Pop-up de pesagem ao abrir a app: o período (dia ou semana, a começar ao domingo) a que o pedido diz respeito,
 * ou `null` quando não há nada a pedir (desligado ou já pesou neste período). Puro.
 */
export function weighInPeriod(freq: WeighInFrequency, today: DateISO, lastWeighIn: DateISO | null): DateISO | null {
  if (freq === 'OFF') return null;
  const start = freq === 'DAILY' ? today : weekStartOf(today);
  if (lastWeighIn && compareDates(lastWeighIn, start) >= 0) return null;
  return start;
}
