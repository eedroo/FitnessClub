/**
 * Ranking semanal por ligas (puro). Cada pessoa compete na liga do seu nível (o nível do XP de sempre) e a posição
 * é pelo XP ganho nesta semana (domingo a sábado, nas datas de cada pessoa). Começa do zero todas as semanas.
 */
export const LEAGUES = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;
export type League = (typeof LEAGUES)[number];

/** Nível mínimo de cada liga (bronze 1–5, prata 6–10, ouro 11–20, platina 21–35, diamante 36+). */
export const LEAGUE_FROM: Record<League, number> = { bronze: 1, silver: 6, gold: 11, platinum: 21, diamond: 36 };

export function leagueOf(level: number): League {
  let out: League = 'bronze';
  for (const l of LEAGUES) if (level >= LEAGUE_FROM[l]) out = l;
  return out;
}

export function isLeague(v: unknown): v is League {
  return typeof v === 'string' && (LEAGUES as readonly string[]).includes(v);
}

export interface LeagueEntry {
  userId: string;
  name: string;
  xp: number;
}

/** Ordena por XP da semana (desc) e dá a posição; empates ficam na mesma posição (1, 2, 2, 4) e por nome. */
export function rankLeague<T extends LeagueEntry>(entries: T[]): (T & { rank: number })[] {
  const sorted = [...entries].sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
  let rank = 0;
  return sorted.map((e, i) => {
    if (i === 0 || e.xp !== sorted[i - 1]!.xp) rank = i + 1;
    return { ...e, rank };
  });
}

/** Pódio de uma semana: os 3 primeiros lugares, só com XP (ninguém ganha com 0). */
export function podium<T extends LeagueEntry & { rank: number }>(ranked: T[]): T[] {
  return ranked.filter((e) => e.rank <= 3 && e.xp > 0);
}
