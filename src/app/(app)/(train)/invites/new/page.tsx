import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { todayInTz } from '@/lib/dates';
import { ensureProfile, getFriendsPage } from '@/lib/social/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { InviteForm } from '@/components/invites/InviteForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invites');
  return { title: t('new') };
}

export default async function NewInvitePage() {
  const { userId } = await bodyPage();
  await ensureProfile(userId);
  const [t, user, friends] = await Promise.all([getTranslations('invites'), db.user.findUnique({ where: { id: userId }, select: { timezone: true } }), getFriendsPage(userId)]);
  return (
    <>
      <BodyHeader title={t('new')} backHref="/invites" backLabel={t('title')} historyBack />
      <div className="mg-body-shell__main">
        <InviteForm today={todayInTz(user?.timezone ?? 'Europe/Lisbon')} friends={friends.friends.map((f) => ({ userId: f.userId, handle: f.handle, displayName: f.displayName }))} />
      </div>
    </>
  );
}
