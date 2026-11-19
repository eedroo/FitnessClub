import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { addDays, formatDateRange, todayInTz } from '@/lib/dates';
import { weekStartOf } from '@/lib/weeks';
import { ranking } from '@/lib/social/groups';
import { weekStats } from '@/lib/gamification/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { Avatar } from '@/components/social/Avatar';
import { GroupActions, RemoveMemberButton } from '@/components/groups/GroupActions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('groups');
  return { title: t('title') };
}

/** Um grupo: meta da semana, quantos cumpriram, ranking (membros) e convite. */
export default async function GroupPage({ params }: { params: { id: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, group, user] = await Promise.all([
    getTranslations('groups'),
    db.group.findUnique({
      where: { id: params.id },
      include: { members: { include: { user: { select: { id: true, socialProfile: { select: { handle: true, displayName: true, avatarUrl: true } } } } } } },
    }),
    db.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);
  if (!group) notFound();
  const member = group.members.some((m) => m.userId === userId);
  if (!member && !group.isPublic) notFound();
  const owner = group.ownerId === userId;
  const weekStart = weekStartOf(todayInTz(user?.timezone ?? 'Europe/Lisbon'));
  const stats = member ? await weekStats(group.members.map((m) => m.userId), weekStart) : [];
  const ranked = ranking(stats, group.goalKind, group.goalTarget);
  const people = new Map(group.members.map((m) => [m.userId, m.user.socialProfile]));
  const met = ranked.filter((r) => r.met).length;
  const num = new Intl.NumberFormat(locale);
  return (
    <>
      <BodyHeader title={group.name} backHref="/groups" backLabel={t('title')} historyBack />
      <div className="mg-body-shell__main">
        {group.description && <p className="mg-ai-program__desc">{group.description}</p>}
        <div className="mg-group-goal">
          <span className="mg-group-goal__label">{t('weekGoal', { range: formatDateRange(weekStart, addDays(weekStart, 6), locale) })}</span>
          <span className="mg-group-goal__value">{t('goalLine', { target: group.goalTarget, kind: t(`goal.${group.goalKind}`) })}</span>
          {member && <span className="mg-group-goal__meta">{t('metCount', { met, n: ranked.length })}</span>}
        </div>
        <GroupActions groupId={group.id} code={member ? group.code : null} member={member} owner={owner} joinable={group.isPublic} />
        {owner && (
          <Link href={`/groups/${group.id}/edit`} className="mg-btn mg-btn--subtle mg-btn--block">
            {t('edit')}
          </Link>
        )}
        {member ? (
          <>
            <h2 className="mg-body-section-title">{t('ranking')}</h2>
            <ol className="mg-program-list mg-ranking">
              {ranked.map((r) => {
                const p = people.get(r.userId);
                if (!p) return null;
                return (
                  <li key={r.userId} className={r.userId === userId ? 'mg-program-row mg-ranking__row mg-ranking__row--me' : 'mg-program-row mg-ranking__row'}>
                    <span className="mg-ranking__place">{r.place}</span>
                    <Link href={r.userId === userId ? '/corpo' : `/u/${p.handle}`} className="mg-friend-row__who">
                      <Avatar name={p.displayName} url={p.avatarUrl} size={36} />
                      <span className="mg-program-row__text">
                        <span className="mg-program-row__name">
                          {p.displayName} {r.met && <span aria-label={t('met')}>✓</span>}
                        </span>
                        <span className="mg-badges__bar" aria-hidden="true">
                          <span className="mg-badges__fill" style={{ width: `${Math.round(r.progress * 100)}%` }} />
                        </span>
                      </span>
                    </Link>
                    <span className="mg-ranking__value">
                      {num.format(r.value)} <small>{t(`unit.${group.goalKind}`)}</small>
                    </span>
                    {owner && r.userId !== userId && <RemoveMemberButton groupId={group.id} userId={r.userId} />}
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <p className="mg-notes__empty">{t('membersOnly', { n: group.members.length })}</p>
        )}
      </div>
    </>
  );
}
