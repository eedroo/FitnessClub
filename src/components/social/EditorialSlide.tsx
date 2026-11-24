import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { WorkoutSnapshot } from '@/lib/social/rules';
import { achievementArt } from '@/lib/gamification/art';
import { isActivityType } from '@/lib/activities/types';
import { formatClock } from '@/lib/fitness/session';
import { formatDayMonth, type DateISO } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';

/**
 * O slide editorial do carrossel (a seguir à foto de capa): o treino, o dia ou a conquista numa página de revista —
 * etiqueta pequena, título grande, números grandes em grelha e a assinatura do app em baixo. Cores invertidas do tema.
 */
export function EditorialSlide({ workout, locale, author }: { workout: WorkoutSnapshot; locale: string; author: string }) {
  const t = useTranslations('social.editorial');
  const tw = useTranslations('social.workout');
  const ta = useTranslations('activities');
  const tg = useTranslations('game');
  const tr = useTranslations('ranking');
  const tc = useTranslations('common');
  const loc = isAppLocale(locale) ? locale : 'pt-PT';
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  // Números grandes sem casas decimais (6 240 kg em vez de 6240,5 kg), para caberem no slide.
  const kg = (v: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: v >= 100 ? 0 : 1 }).format(v);
  const day = (d: string) => formatDayMonth(d as DateISO, loc);

  let kicker: string;
  let title: string;
  let stats: { label: string; value: string; unit?: string }[] = [];
  let list: string[] = [];
  let art: string | null = null;
  switch (workout.kind) {
    case 'session':
      kicker = t('session', { date: day(workout.date) });
      title = workout.name ?? tw('free');
      stats = [
        { label: t('time'), value: formatClock(workout.durationSec) },
        { label: t('sets'), value: String(workout.sets) },
        { label: t('volume'), value: kg(workout.volumeKg), unit: 'kg' },
        { label: t('prs'), value: String(workout.prs) },
      ];
      list = workout.exercises;
      break;
    case 'activity': {
      const type = isActivityType(workout.type) ? workout.type : 'other';
      kicker = t('activity', { date: day(workout.date) });
      title = ta(`types.${type}`);
      stats = [{ label: t('time'), value: formatClock(workout.durationSec) }];
      if (workout.distanceMeters != null) stats.push({ label: t('distance'), value: ta('km', { km: num.format(workout.distanceMeters / 1000) }) });
      if (workout.effort != null) stats.push({ label: t('effort'), value: `${workout.effort}/10` });
      break;
    }
    case 'day':
      kicker = t('day', { date: day(workout.date) });
      title = t('dayTitle');
      stats = [
        { label: t('minutes'), value: String(workout.minutes) },
        { label: t('sets'), value: String(workout.sets) },
        { label: t('volume'), value: kg(workout.volumeKg), unit: 'kg' },
        { label: t('prs'), value: String(workout.prs) },
      ];
      list = workout.names;
      break;
    case 'badge':
      kicker = t('badge', { date: day(workout.earnedOn) });
      title = tg.has(`badges.${workout.id}.name`) ? tg(`badges.${workout.id}.name`) : workout.id;
      list = tg.has(`badges.${workout.id}.how`) ? [tg(`badges.${workout.id}.how`)] : [];
      art = achievementArt({ kind: 'badge', id: workout.id });
      break;
    case 'level':
      kicker = t('level');
      title = tg('level', { n: workout.level });
      art = achievementArt({ kind: 'level', level: workout.level });
      break;
    case 'tier':
      kicker = t('tier');
      title = tg.has(`tiers.${workout.tier}`) ? tg(`tiers.${workout.tier}`) : workout.tier;
      list = [workout.exercise];
      art = achievementArt({ kind: 'tier', tier: workout.tier });
      break;
    case 'league':
      kicker = t('league', { date: day(workout.weekStart) });
      title = tw('leagueRank', { rank: workout.rank });
      stats = [{ label: t('xp'), value: String(workout.xp) }];
      list = [tr('league', { name: tr.has(`leagues.${workout.league}`) ? tr(`leagues.${workout.league}`) : workout.league })];
      art = achievementArt({ kind: 'league', tier: workout.league });
      break;
  }

  return (
    <div className={`mg-editorial${art ? ' mg-editorial--art' : ''}`}>
      <p className="mg-editorial__kicker">{kicker}</p>
      {art && <Image className="mg-editorial__art" src={art} alt="" width={160} height={160} />}
      <h3 className="mg-editorial__title">{title}</h3>
      {stats.length > 0 && (
        <dl className="mg-editorial__stats">
          {stats.map((s) => (
            <div key={s.label} className="mg-editorial__stat">
              <dt>{s.label}</dt>
              <dd>
                {s.value}
                {s.unit && <span className="mg-editorial__unit"> {s.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {list.length > 0 && <p className="mg-editorial__list">{list.join(' · ')}</p>}
      <p className="mg-editorial__sign">
        {author} · {tc('appName')}
      </p>
    </div>
  );
}
