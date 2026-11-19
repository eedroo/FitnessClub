import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { ensureProfile } from '@/lib/social/server';
import { BodyHeader } from '@/components/body/BodyHeader';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('groups');
  return { title: t('title') };
}

/** Grupos: os meus, os públicos para entrar e criar um novo. */
export default async function GroupsPage() {
  const { userId } = await bodyPage();
  await ensureProfile(userId);
  const [t, ts, mine, open] = await Promise.all([
    getTranslations('groups'),
    getTranslations('social'),
    db.group.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, goalKind: true, goalTarget: true, _count: { select: { members: true } } },
    }),
    db.group.findMany({
      where: { isPublic: true, members: { none: { userId } } },
      orderBy: { members: { _count: 'desc' } },
      take: 30,
      select: { id: true, name: true, description: true, goalKind: true, goalTarget: true, _count: { select: { members: true } } },
    }),
  ]);
  const row = (g: { id: string; name: string; goalKind: 'SESSIONS' | 'MINUTES' | 'XP'; goalTarget: number; _count: { members: number }; description?: string | null }) => (
    <li key={g.id}>
      <Link href={`/groups/${g.id}`} className="mg-program-row">
        <span className="mg-program-row__text">
          <span className="mg-program-row__name">{g.name}</span>
          <span className="mg-program-row__meta">
            {t('goalLine', { target: g.goalTarget, kind: t(`goal.${g.goalKind}`) })} · {t('members', { n: g._count.members })}
          </span>
          {g.description && <span className="mg-program-row__meta">{g.description}</span>}
        </span>
      </Link>
    </li>
  );
  return (
    <>
      <BodyHeader title={t('title')} backHref="/feed" backLabel={ts('feed')} />
      <div className="mg-body-shell__main">
        <Link href="/groups/new" className="mg-btn mg-btn--primary mg-btn--block">
          {t('new')}
        </Link>
        <h2 className="mg-body-section-title">{t('mine')}</h2>
        {mine.length ? <ul className="mg-program-list">{mine.map(row)}</ul> : <p className="mg-notes__empty">{t('noneMine')}</p>}
        {open.length > 0 && (
          <>
            <h2 className="mg-body-section-title">{t('public')}</h2>
            <ul className="mg-program-list">{open.map(row)}</ul>
          </>
        )}
      </div>
    </>
  );
}
