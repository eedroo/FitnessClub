import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { BodyHeader } from '@/components/body/BodyHeader';
import { GroupForm } from '@/components/groups/GroupForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('groups');
  return { title: t('new') };
}

export default async function NewGroupPage() {
  await bodyPage();
  const t = await getTranslations('groups');
  return (
    <>
      <BodyHeader title={t('new')} backHref="/groups" backLabel={t('title')} />
      <div className="mg-body-shell__main">
        <GroupForm initial={{ name: '', description: '', isPublic: false, goalKind: 'SESSIONS', goalTarget: 3 }} />
      </div>
    </>
  );
}
