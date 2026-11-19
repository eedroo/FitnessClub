import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DateTime } from 'luxon';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { todayInTz } from '@/lib/dates';
import { isActivityType } from '@/lib/activities/types';
import { BodyHeader } from '@/components/body/BodyHeader';
import { ActivityForm } from '@/components/activities/ActivityForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('activities');
  return { title: t('new') };
}

/** Registar uma atividade (`?date=` vem do Dia; `?type=` pré-escolhe o tipo). */
export default async function NewActivityPage({ searchParams }: { searchParams: { date?: string; type?: string } }) {
  const { userId } = await bodyPage();
  const [t, tf, user] = await Promise.all([
    getTranslations('activities'),
    getTranslations('fitness'),
    db.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);
  const tz = user?.timezone ?? 'Europe/Lisbon';
  const today = todayInTz(tz);
  const date = searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) && searchParams.date <= today ? searchParams.date : today;
  // Hora sugerida: há uma hora (acabou de fazer), arredondada aos 5 minutos.
  const ago = DateTime.now().setZone(tz).minus({ hours: 1 });
  const time = `${String(ago.hour).padStart(2, '0')}:${String(Math.floor(ago.minute / 5) * 5).padStart(2, '0')}`;
  return (
    <>
      <BodyHeader title={t('new')} backHref="/" backLabel={tf('nav.workouts')} />
      <div className="mg-body-shell__main">
        <ActivityForm
          today={today}
          initial={{
            type: searchParams.type && isActivityType(searchParams.type) ? searchParams.type : null,
            date,
            time,
            durationMin: 45,
            effort: null,
            distanceKm: '',
            notes: '',
          }}
        />
      </div>
    </>
  );
}
