import { describe, expect, it } from 'vitest';
import { weighInPeriod } from './weighIn';

describe('pedido de pesagem', () => {
  it('desligado nunca pede', () => {
    expect(weighInPeriod('OFF', '2026-11-24', null)).toBeNull();
  });
  it('diário: pede hoje até haver registo de hoje', () => {
    expect(weighInPeriod('DAILY', '2026-11-24', '2026-11-23')).toBe('2026-11-24');
    expect(weighInPeriod('DAILY', '2026-11-24', '2026-11-24')).toBeNull();
    expect(weighInPeriod('DAILY', '2026-11-24', null)).toBe('2026-11-24');
  });
  it('semanal: uma vez por semana (domingo a sábado)', () => {
    // 24/11/2026 é terça; a semana começa no domingo 22
    expect(weighInPeriod('WEEKLY', '2026-11-24', '2026-11-21')).toBe('2026-11-22');
    expect(weighInPeriod('WEEKLY', '2026-11-24', '2026-11-22')).toBeNull();
  });
});
