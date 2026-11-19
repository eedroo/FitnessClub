import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { normalizeHandle, relationship } from '@/lib/social/rules';
import { getProfileByHandle } from '@/lib/social/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { ProfileOverview } from '@/components/social/ProfileOverview';

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  return { title: `@${normalizeHandle(decodeURIComponent(params.handle))}` };
}

/** Perfil de outra pessoa (o meu vive no "Eu"). */
export default async function ProfilePage({ params }: { params: { handle: string } }) {
  const { userId, locale } = await bodyPage();
  const handle = normalizeHandle(decodeURIComponent(params.handle));
  const [t, data] = await Promise.all([getTranslations('social'), getProfileByHandle(userId, handle)]);
  if (!data) notFound();
  if (data.profile.userId === userId) redirect('/corpo');
  const rel = relationship(userId, data.profile.userId, data.rows, data.iBlocked);
  const incoming = data.rows.find((r) => r.requesterId === data.profile.userId && r.status === 'PENDING');
  return (
    <>
      <BodyHeader title={data.profile.displayName} backHref="/feed" backLabel={t('feed')} historyBack />
      <div className="mg-body-shell__main">
        <ProfileOverview viewerId={userId} profile={data.profile} rel={rel} friendshipId={incoming?.id ?? null} friendsCount={data.friendsCount} locale={locale} />
      </div>
    </>
  );
}
