import { describe, expect, it } from 'vitest';
import { canSeePost, handleSchema, initials, normalizeHandle, relationship } from './rules';

describe('@', () => {
  it('normaliza e valida', () => {
    expect(normalizeHandle(' @Ana.Silva ')).toBe('ana.silva');
    expect(handleSchema.safeParse('@Ana_Fit').success).toBe(true);
    for (const bad of ['ab', 'a'.repeat(21), '.ana', 'ana.', 'an..a', 'ana silva', 'ána', 'admin', 'FitnessClub']) expect(handleSchema.safeParse(bad).success).toBe(false);
  });
});

describe('visibilidade', () => {
  const ctx = { friends: new Set(['f']), blocked: new Set(['b']) };
  const post = (authorId: string, visibility: 'PUBLIC' | 'FRIENDS', hiddenAt: Date | null = null) => ({ authorId, visibility, hiddenAt });
  it('público para todos, amigos só para amigos, nunca com bloqueio nem escondido', () => {
    expect(canSeePost(post('x', 'PUBLIC'), 'me', ctx)).toBe(true);
    expect(canSeePost(post('x', 'FRIENDS'), 'me', ctx)).toBe(false);
    expect(canSeePost(post('f', 'FRIENDS'), 'me', ctx)).toBe(true);
    expect(canSeePost(post('b', 'PUBLIC'), 'me', ctx)).toBe(false);
    expect(canSeePost(post('x', 'PUBLIC', new Date()), 'me', ctx)).toBe(false);
    expect(canSeePost(post('me', 'FRIENDS', new Date()), 'me', ctx)).toBe(true);
  });
});

describe('amizade', () => {
  it('estado a partir dos pedidos', () => {
    const rows = [
      { requesterId: 'me', addresseeId: 'a', status: 'PENDING' as const },
      { requesterId: 'b', addresseeId: 'me', status: 'PENDING' as const },
      { requesterId: 'c', addresseeId: 'me', status: 'ACCEPTED' as const },
    ];
    expect(['me', 'a', 'b', 'c', 'd'].map((o) => relationship('me', o, rows, false))).toEqual(['self', 'outgoing', 'incoming', 'friends', 'none']);
    expect(relationship('me', 'c', rows, true)).toBe('blocked');
  });
  it('iniciais', () => {
    expect([initials('Ana Maria Silva'), initials('carla'), initials('  ')]).toEqual(['AS', 'C', '?']);
  });
});
