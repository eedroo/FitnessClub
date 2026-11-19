import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { BodyHeader } from '@/components/body/BodyHeader';
import { GroupForm } from '@/components/groups/GroupForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('groups');
  return { title: t('edit') };
}

/** Editar ou apagar um grupo (só o dono). */
export default async function EditGroupPage({ params }: { params: { id: string } }) {
  const { userId } = await bodyPage();
  const [t, group] = await Promise.all([getTranslations('groups'), db.group.findFirst({ where: { id: params.id, ownerId: userId } })]);
  if (!group) notFound();
  return (
    <>
      <BodyHeader title={t('edit')} backHref={`/groups/${group.id}`} backLabel={group.name} />
      <div className="mg-body-shell__main">
        <GroupForm
          groupId={group.id}
          initial={{ name: group.name, description: group.description ?? '', isPublic: group.isPublic, goalKind: group.goalKind, goalTarget: group.goalTarget }}
        />
      </div>
    </>
  );
}
