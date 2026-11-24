import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { getLeagueBoard } from '@/lib/social/ranking';
import { LEAGUES, LEAGUE_FROM, isLeague } from '@/lib/social/leagues';
import { tierArt } from '@/lib/gamification/art';
import { addDays, formatDayMonth } from '@/lib/dates';
import { BodyHeader } from '@/components/body/BodyHeader';
import { Avatar } from '@/components/social/Avatar';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ranking');
  return { title: t('title') };
}

/** Ranking semanal por ligas: a liga da pessoa (ou outra pelos separadores), posições pelo XP desta semana. */
export default async function RankingPage({ searchParams }: { searchParams: { league?: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, tg, tf] = await Promise.all([getTranslations('ranking'), getTranslations('game'), getTranslations('fitness')]);
  const board = await getLeagueBoard(userId, isLeague(searchParams.league) ? searchParams.league : undefined);
  const me = board.rows.find((r) => r.me);
  const name = (l: (typeof LEAGUES)[number]) => t(`leagues.${l}`);
  return (
    <>
      <BodyHeader title={t('title')} backHref="/feed" backLabel={tf('nav.feed')} />
      <div className="mg-body-shell__main">
        <section className="mg-league-head">
          <Image className="mg-league-head__medal" src={tierArt(board.league)} alt="" width={72} height={72} />
          <div className="mg-league-head__text">
            <h2 className="mg-league-head__title">{t('league', { name: name(board.league) })}</h2>
            <p className="mg-league-head__meta">
              {t('week', { from: formatDayMonth(board.weekStart, locale), to: formatDayMonth(addDays(board.weekStart, 6), locale) })}
            </p>
            {board.league === board.myLeague && me && <p className="mg-league-head__me">{t('myRank', { rank: me.rank, total: board.rows.length, xp: me.xp })}</p>}
          </div>
        </section>

        <nav className="mg-league-tabs" aria-label={t('leaguesLabel')}>
          {LEAGUES.map((l) => (
            <Link
              key={l}
              href={l === board.myLeague ? '/ranking' : `/ranking?league=${l}`}
              className={l === board.league ? 'mg-league-tabs__tab mg-league-tabs__tab--on' : 'mg-league-tabs__tab'}
              aria-current={l === board.league ? 'page' : undefined}
            >
              {name(l)}
              {l === board.myLeague && <span className="mg-league-tabs__mine">{t('mine')}</span>}
            </Link>
          ))}
        </nav>

        {!board.inRanking && (
          <p className="mg-day-metrics__note">
            <Link href="/feed/profile">{t('out')}</Link>
          </p>
        )}

        {board.rows.length ? (
          <ol className="mg-league-list">
            {board.rows.map((r) => (
              <li key={r.userId} className={r.me ? 'mg-league-row mg-league-row--me' : 'mg-league-row'}>
                <span className={`mg-league-row__rank${r.rank <= 3 && r.xp > 0 ? ` mg-league-row__rank--${r.rank}` : ''}`}>{r.rank}</span>
                <Link href={`/u/${r.handle}`} className="mg-league-row__who">
                  <Avatar name={r.name} url={r.avatarUrl} size={36} />
                  <span className="mg-league-row__text">
                    <span className="mg-league-row__name">{r.me ? t('you', { name: r.name }) : r.name}</span>
                    <span className="mg-league-row__meta">
                      @{r.handle} · {tg('level', { n: r.level })}
                    </span>
                  </span>
                </Link>
                <span className="mg-league-row__xp">{t('xp', { n: r.xp })}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mg-body-empty">{t('empty')}</p>
        )}

        <section className="mg-league-how">
          <h2 className="mg-body-section-title">{t('how.title')}</h2>
          <p className="mg-day-metrics__note">{t('how.text')}</p>
          <ul className="mg-league-how__list">
            {LEAGUES.map((l, i) => {
              const next = LEAGUES[i + 1];
              return (
                <li key={l}>
                  {next ? t('how.range', { name: name(l), from: LEAGUE_FROM[l], to: LEAGUE_FROM[next] - 1 }) : t('how.rangeTop', { name: name(l), from: LEAGUE_FROM[l] })}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
