import { describe, expect, it } from 'vitest';
import { leagueOf, podium, rankLeague } from './leagues';

describe('ligas semanais', () => {
  it('liga pelo nível', () => {
    expect(leagueOf(1)).toBe('bronze');
    expect(leagueOf(5)).toBe('bronze');
    expect(leagueOf(6)).toBe('silver');
    expect(leagueOf(11)).toBe('gold');
    expect(leagueOf(21)).toBe('platinum');
    expect(leagueOf(36)).toBe('diamond');
    expect(leagueOf(400)).toBe('diamond');
  });
  it('posição pelo XP da semana, empates na mesma posição', () => {
    const r = rankLeague([
      { userId: 'a', name: 'Ana', xp: 120 },
      { userId: 'b', name: 'Bia', xp: 300 },
      { userId: 'c', name: 'Caio', xp: 120 },
      { userId: 'd', name: 'Duda', xp: 0 },
    ]);
    expect(r.map((e) => [e.userId, e.rank])).toEqual([
      ['b', 1],
      ['a', 2],
      ['c', 2],
      ['d', 4],
    ]);
    expect(podium(r).map((e) => e.userId)).toEqual(['b', 'a', 'c']);
  });
  it('ninguém sobe ao pódio com 0 XP', () => {
    expect(podium(rankLeague([{ userId: 'a', name: 'A', xp: 0 }]))).toEqual([]);
  });
});
