import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ActivityListItem } from '@/lib/activities/queries';
import { effortBand } from '@/lib/activities/types';
import { formatDayMonth, type DateISO } from '@/lib/dates';
import { formatClock } from '@/lib/fitness/session';
import type { AppLocale } from '@/i18n/locales';
import { ActivityIcon } from './ActivityIcon';

/** Uma atividade numa lista (Sessões, Dia): ícone, tipo, distância/esforço, dia e duração. Abre para editar. */
export async function ActivityRow({ activity, locale, showDate = true }: { activity: ActivityListItem; locale: AppLocale; showDate?: boolean }) {
  const t = await getTranslations('activities');
  const km = activity.distanceMeters != null ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(activity.distanceMeters / 1000) : null;
  const meta = [km && t('km', { km }), activity.effort && t(`effortBands.${effortBand(activity.effort)}`)].filter(Boolean).join(' · ');
  return (
    <Link href={`/activities/${activity.id}`} className="mg-session-row mg-activity-row">
      <ActivityIcon type={activity.type} />
      <span className="mg-session-row__text">
        <span className="mg-session-row__name">{t(`types.${activity.type}`)}</span>
        {meta && <span className="mg-session-row__meta">{meta}</span>}
      </span>
      <span className="mg-session-row__time">
        {showDate && `${formatDayMonth(activity.date as DateISO, locale)} · `}
        {formatClock(activity.durationSec)}
      </span>
    </Link>
  );
}
