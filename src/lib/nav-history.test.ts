import { describe, expect, it } from 'vitest';
import { canGoBack, pushPath, readStack } from './nav-history';

describe('histórico de navegação', () => {
  it('empilha, ignora a repetição e reconhece o voltar', () => {
    let s: string[] = [];
    s = pushPath(s, '/sessions/s1');
    s = pushPath(s, '/exercises/Squat');
    expect(s).toEqual(['/sessions/s1', '/exercises/Squat']);
    expect(canGoBack(s)).toBe(true);
    expect(pushPath(s, '/exercises/Squat')).toEqual(s);
    expect(pushPath(s, '/sessions/s1')).toEqual(['/sessions/s1']);
  });

  it('entrada directa (link de fora): sem página anterior', () => {
    expect(canGoBack(pushPath([], '/exercises/Squat'))).toBe(false);
  });

  it('lê com segurança', () => {
    expect(readStack('nope')).toEqual([]);
    expect(readStack('["/a", 3]')).toEqual(['/a']);
  });
});
