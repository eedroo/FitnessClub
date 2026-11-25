import 'server-only';
import { db } from '@/lib/db';
import { addDays, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { weekStartOf } from '@/lib/weeks';
import { levelsFor, weekStats } from '@/lib/gamification/server';
import { blockedIds } from './server';
import { leagueOf, podium, rankLeague, type League } from './leagues';
import { pushToUser } from '@/lib/notifications/send';
import { leagueStartNotification, leagueWinNotification, rankingLaunchNotification } from '@/lib/notifications/content';

/**
 * Ranking semanal por ligas. A semana é domingo a sábado nas datas de cada pessoa (as sessões e atividades já são
 * gravadas com a data local). Entra quem está no ranking (`SocialProfile.inRanking`) e treinou nessa semana.
 */

/** Quem está no ranking e treinou (sessão com séries ou atividade) na semana de `weekStart`. */
async function activeIn(weekStart: DateISO): Promise<string[]> {
  const range = { gte: toDbDate(weekStart), lte: toDbDate(addDays(weekStart, 6)) };
  const [sessions, activities] = await Promise.all([
    db.fitnessSession.findMany({ where: { endedAt: { not: null }, date: range, sets: { some: {} } }, select: { userId: true }, distinct: ['userId'] }),
    db.activity.findMany({ where: { date: range, durationSec: { gte: 60 } }, select: { userId: true }, distinct: ['userId'] }),
  ]);
  const ids = [...new Set([...sessions, ...activities].map((x) => x.userId))];
  if (!ids.length) return [];
  const inRanking = await db.socialProfile.findMany({ where: { userId: { in: ids }, inRanking: true }, select: { userId: true } });
  return inRanking.map((p) => p.userId);
}

export interface BoardRow {
  userId: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  rank: number;
  me: boolean;
  isBot: boolean;
}

/** Todos os participantes da semana, com nível, liga, XP e posição dentro da liga. */
async function standings(weekStart: DateISO, extra: string[] = []) {
  const ids = [...new Set([...(await activeIn(weekStart)), ...extra])];
  if (!ids.length) return [] as (Omit<BoardRow, 'me'> & { league: League })[];
  const [levels, stats, profiles] = await Promise.all([
    levelsFor(ids),
    weekStats(ids, weekStart),
    db.socialProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, handle: true, displayName: true, avatarUrl: true, user: { select: { isBot: true } } } }),
  ]);
  const xp = new Map(stats.map((s) => [s.userId, s.xp]));
  const rows = profiles.map((p) => {
    const level = levels.get(p.userId) ?? 1;
    return { userId: p.userId, handle: p.handle, name: p.displayName, avatarUrl: p.avatarUrl, isBot: p.user.isBot, level, league: leagueOf(level), xp: xp.get(p.userId) ?? 0 };
  });
  const out: (Omit<BoardRow, 'me'> & { league: League })[] = [];
  for (const league of new Set(rows.map((r) => r.league))) out.push(...rankLeague(rows.filter((r) => r.league === league)));
  return out;
}

export interface LeagueBoard {
  weekStart: DateISO;
  /** A liga a mostrar (a da pessoa por defeito). */
  league: League;
  myLeague: League;
  /** Fora do ranking (desligou): vê na mesma, sem aparecer. */
  inRanking: boolean;
  rows: BoardRow[];
  /** Pessoas por liga nesta semana (para os separadores). */
  counts: Record<League, number>;
}

/** O ranking desta semana para quem vê: a sua liga (ou `league`), sem quem bloqueou ou foi bloqueado. */
export async function getLeagueBoard(viewerId: string, league?: League): Promise<LeagueBoard> {
  const [user, profile, blocked] = await Promise.all([
    db.user.findUnique({ where: { id: viewerId }, select: { timezone: true } }),
    db.socialProfile.findUnique({ where: { userId: viewerId }, select: { inRanking: true } }),
    blockedIds(viewerId),
  ]);
  const weekStart = weekStartOf(todayInTz(user?.timezone ?? 'Europe/Lisbon'));
  const inRanking = profile?.inRanking ?? true;
  const all = await standings(weekStart, inRanking ? [viewerId] : []);
  const myLevel = all.find((r) => r.userId === viewerId)?.level ?? (await levelsFor([viewerId])).get(viewerId) ?? 1;
  const myLeague = leagueOf(myLevel);
  const shown = league ?? myLeague;
  const counts = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 } as Record<League, number>;
  for (const r of all) counts[r.league]++;
  const rows = all
    .filter((r) => r.league === shown && !blocked.has(r.userId))
    .map(({ league: _l, ...r }) => ({ ...r, me: r.userId === viewerId }));
  return { weekStart, league: shown, myLeague, inRanking, rows, counts };
}

/**
 * Fecha a semana de `weekStart`: grava o pódio de cada liga (`LeagueResult`, idempotente) e devolve-o para os
 * avisos. Corre ao domingo, depois de a semana ter acabado para toda a gente.
 */
export async function closeLeagueWeek(weekStart: DateISO): Promise<{ userId: string; league: League; rank: number; xp: number }[]> {
  // Os bots (contas de demonstração) contam na lista mas nunca ganham: o pódio é só de pessoas.
  const bots = new Set((await db.user.findMany({ where: { isBot: true }, select: { id: true } })).map((u) => u.id));
  const all = (await standings(weekStart)).filter((r) => !bots.has(r.userId));
  const winners = [...new Set(all.map((r) => r.league))].flatMap((league) => podium(rankLeague(all.filter((r) => r.league === league))));
  const out = winners.map((w) => ({ userId: w.userId, league: w.league, rank: w.rank, xp: w.xp }));
  for (const w of out) {
    await db.leagueResult.upsert({
      where: { userId_weekStart: { userId: w.userId, weekStart: toDbDate(weekStart) } },
      create: { userId: w.userId, weekStart: toDbDate(weekStart), league: w.league, rank: w.rank, xp: w.xp },
      update: { league: w.league, rank: w.rank, xp: w.xp },
    });
  }
  return out;
}

/**
 * Avisos de domingo: quem ficou no pódio recebe a vitória; quem está no ranking e tem notificações recebe "começou
 * uma nova semana". Quem saiu do ranking não recebe nada.
 */
export async function notifyLeagueWeek(winners: { userId: string; league: string; rank: number }[]): Promise<{ sent: number }> {
  const subs = await db.pushSubscription.findMany({ select: { userId: true }, distinct: ['userId'] });
  const ids = subs.map((s) => s.userId);
  if (!ids.length) return { sent: 0 };
  const people = await db.user.findMany({ where: { id: { in: ids }, socialProfile: { inRanking: true } }, select: { id: true, locale: true } });
  const won = new Map(winners.map((w) => [w.userId, w]));
  let sent = 0;
  for (const p of people) {
    const w = won.get(p.id);
    const content = w ? leagueWinNotification(p.locale, w.league, w.rank) : leagueStartNotification(p.locale);
    sent += await pushToUser(p.id, { ...content, tag: w ? 'league-win' : 'league-start' }).catch(() => 0);
  }
  return { sent };
}

/** Anúncio único do ranking (botão no admin): a todos com notificações que estão no ranking. */
export async function announceRanking(): Promise<{ people: number; sent: number }> {
  const subs = await db.pushSubscription.findMany({ select: { userId: true }, distinct: ['userId'] });
  const people = await db.user.findMany({ where: { id: { in: subs.map((s) => s.userId) }, socialProfile: { inRanking: true } }, select: { id: true, locale: true } });
  let sent = 0;
  for (const p of people) sent += await pushToUser(p.id, { ...rankingLaunchNotification(p.locale), tag: 'ranking-launch' }).catch(() => 0);
  return { people: people.length, sent };
}
