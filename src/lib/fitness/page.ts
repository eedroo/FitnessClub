import 'server-only';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { getEntitlements } from '@/lib/entitlements/server';
import { isAppLocale, type AppLocale } from '@/i18n/locales';

/** Páginas do treino: sessão, acesso `pro` (sem ele → `/locked`, o cadeado premium) e a língua do pedido. */
export async function bodyPage(): Promise<{ userId: string; locale: AppLocale }> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!(await getEntitlements(session.user.id)).features.pro) redirect('/locked');
  const raw = await getLocale();
  return { userId: session.user.id, locale: isAppLocale(raw) ? raw : 'pt-PT' };
}
