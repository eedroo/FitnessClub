import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { BodyHeader } from '@/components/body/BodyHeader';
import { JoinByCode } from '@/components/groups/GroupActions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('groups');
  return { title: t('inviteTitle') };
}

/** Link de convite: mostra o grupo e "Entrar" (quem já é membro vai direto ao grupo). */
export default async function JoinGroupPage({ params }: { params: { code: string } }) {
  const { userId } = await bodyPage();
  if (!/^[a-z0-9]{10}$/.test(params.code)) notFound();
  const [t, group] = await Promise.all([
    getTranslations('groups'),
    db.group.findUnique({ where: { code: params.code }, select: { id: true, name: true, description: true, goalKind: true, goalTarget: true, _count: { select: { members: true } } } }),
  ]);
  if (!group) notFound();
  if (await db.groupMember.findUnique({ where: { groupId_userId: { groupId: group.id, userId } } })) redirect(`/groups/${group.id}`);
  return (
    <>
      <BodyHeader title={t('inviteTitle')} backHref="/groups" backLabel={t('title')} />
      <div className="mg-body-shell__main">
        <div className="mg-social-join">
          <h2 className="mg-social-join__title">{group.name}</h2>
          {group.description && <p className="mg-social-join__text">{group.description}</p>}
          <p className="mg-social-join__text">
            {t('goalLine', { target: group.goalTarget, kind: t(`goal.${group.goalKind}`) })} · {t('members', { n: group._count.members })}
          </p>
          <JoinByCode code={params.code} />
        </div>
      </div>
    </>
  );
}
