import { describe, expect, it } from 'vitest';
import { accentOrDefault, isAccent } from './accent';

describe('accent', () => {
  it('aceita só as cores da lista', () => {
    expect(isAccent('blue')).toBe(true);
    expect(isAccent('red')).toBe(false);
    expect(isAccent(undefined)).toBe(false);
  });

  it('valor desconhecido → laranja', () => {
    expect(accentOrDefault('pink')).toBe('pink');
    expect(accentOrDefault('<script>')).toBe('orange');
  });
});
