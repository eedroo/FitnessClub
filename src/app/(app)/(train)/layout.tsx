import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getEntitlements } from '@/lib/entitlements/server';
import { getActiveSessionBrief } from '@/lib/fitness/queries';
import { BodyShell } from '@/components/body/BodyShell';

/** Os treinos (recurso `pro`), com navegação própria; sem acesso, o cadeado premium em `/locked`. */
export default async function TrainLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const entitlements = await getEntitlements(session.user.id);
  if (!entitlements.features.pro) redirect('/locked');
  const active = await getActiveSessionBrief(session.user.id);

  return (
    <BodyShell activeSession={active}>
      <div id="main">{children}</div>
    </BodyShell>
  );
}
