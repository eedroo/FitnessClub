import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { formatDayMonth, fromDbDate } from '@/lib/dates';
import { ensureProfile } from '@/lib/social/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { PostComposer, type ShareOption } from '@/components/social/PostComposer';
import { getGamification, getStrengthLevels } from '@/lib/gamification/server';
import { exerciseName, type ExerciseNames } from '@/lib/fitness/library';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social.composer');
  return { title: t('title') };
}

/** Nova publicação (o "+" do Feed; `?share=<anexo>` vem dos resumos, do Dia e das conquistas). */
export default async function NewPostPage({ searchParams }: { searchParams: { share?: string } }) {
  const { userId, locale } = await bodyPage();
  await ensureProfile(userId);
  const [t, ts, ta, tf, sessions, activities] = await Promise.all([
    getTranslations('social.composer'),
    getTranslations('social'),
    getTranslations('activities'),
    getTranslations('fitness'),
    db.fitnessSession.findMany({
      where: { userId, endedAt: { not: null }, sets: { some: {} } },
      orderBy: { startedAt: 'desc' },
      take: 12,
      select: { id: true, date: true, workout: { select: { name: true } } },
    }),
    db.activity.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 8, select: { id: true, date: true, type: true } }),
  ]);
  // Conquistas: emblemas ganhos, o nível, medalhas de força e vitórias no ranking.
  const [game, strength, wins, tg, tr] = await Promise.all([
    getGamification(userId),
    getStrengthLevels(userId),
    db.leagueResult.findMany({ where: { userId }, orderBy: { weekStart: 'desc' }, take: 8 }),
    getTranslations('game'),
    getTranslations('ranking'),
  ]);
  const tiers = strength.levels.filter((l) => l.tier);
  const exNames = new Map(
    (await db.exercise.findMany({ where: { id: { in: tiers.map((l) => l.exerciseId) } }, select: { id: true, names: true } })).map((e) => [
      e.id,
      exerciseName(e.names as ExerciseNames, locale),
    ]),
  );
  // Dias com treino (os últimos, sem repetir).
  const days = [...new Set([...sessions.map((s) => fromDbDate(s.date)), ...activities.map((a) => fromDbDate(a.date))])].sort().reverse().slice(0, 8);
  const options: ShareOption[] = [
    ...sessions.map((s) => ({ group: 'workouts' as const, value: `session:${s.id}`, label: `${s.workout?.name ?? tf('sessions.free')} · ${formatDayMonth(fromDbDate(s.date), locale)}` })),
    ...activities.map((a) => ({ group: 'workouts' as const, value: `activity:${a.id}`, label: `${ta(`types.${a.type}`)} · ${formatDayMonth(fromDbDate(a.date), locale)}` })),
    ...days.map((d) => ({ group: 'days' as const, value: `day:${d}`, label: t('dayOption', { date: formatDayMonth(d, locale) }) })),
    { group: 'achievements' as const, value: 'level', label: tg('level', { n: game.summary.level }) },
    ...game.badges.filter((b) => b.earnedOn).map((b) => ({ group: 'achievements' as const, value: `badge:${b.id}`, label: tg(`badges.${b.id}.name`) })),
    ...tiers.map((l) => ({ group: 'achievements' as const, value: `tier:${l.exerciseId}`, label: `${tg(`tiers.${l.tier}`)} · ${exNames.get(l.exerciseId) ?? l.exerciseId}` })),
    ...wins.map((w) => {
      const ws = fromDbDate(w.weekStart);
      return { group: 'achievements' as const, value: `league:${ws}`, label: t('winOption', { rank: w.rank, league: tr(`leagues.${w.league}`), date: formatDayMonth(ws, locale) }) };
    }),
  ];
  // Um dia mais antigo vindo do Dia também se pode partilhar (o servidor confirma que houve treino).
  const askedDay = /^day:(\d{4}-\d{2}-\d{2})$/.exec(searchParams.share ?? '')?.[1];
  if (askedDay && !options.some((o) => o.value === `day:${askedDay}`))
    options.push({ group: 'days', value: `day:${askedDay}`, label: t('dayOption', { date: formatDayMonth(askedDay, locale) }) });
  const share = searchParams.share && options.some((o) => o.value === searchParams.share) ? searchParams.share : '';
  return (
    <>
      <BodyHeader title={t('title')} backHref="/feed" backLabel={ts('feed')} historyBack />
      <div className="mg-body-shell__main">
        <PostComposer userId={userId} options={options} initialAttach={share} />
      </div>
    </>
  );
}
