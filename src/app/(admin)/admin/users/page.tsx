import Link from 'next/link';
import { db } from '@/lib/db';
import { GlassCard } from '@/components/ui/GlassCard';
import { UserTable } from '@/components/admin/UserTable';
import { PremiumRequestActions } from '@/components/admin/PremiumRequestActions';

const PAGE = 50;

/** Utilizadores: pedidos de Premium por tratar no topo; pesquisa por email, 50 por página. Sem nada dos treinos nem do peso. */
export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q ?? '').trim().slice(0, 120);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = q ? { email: { contains: q, mode: 'insensitive' as const } } : {};
  const [requests, count, users] = await Promise.all([
    db.user.findMany({
      where: { premiumRequestedAt: { not: null }, plan: 'FREE' },
      orderBy: { premiumRequestedAt: 'asc' },
      take: 100,
      select: { id: true, email: true, name: true, premiumRequestedAt: true },
    }),
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true, email: true, name: true, createdAt: true, lastActiveAt: true, plan: true, planSource: true, planExpiresAt: true,
        onboardedAt: true,
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const href = (p: number) => `/admin/users?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`;

  return (
    <>
      <h1 className="mg-admin__title">Utilizadores</h1>
      {requests.length > 0 && (
        <GlassCard title={`Pedidos de Premium (${requests.length})`}>
          <p className="mg-admin__note">Pedidos feitos no app («Quero o Premium»). Dar Premium avisa a pessoa por push.</p>
          {requests.map((r) => (
            <div key={r.id} className="mg-admin__request">
              <p className="mg-admin__note">
                <Link href={`/admin/users/${r.id}`}>{r.email}</Link>
                {r.name ? ` · ${r.name}` : ''} · {r.premiumRequestedAt!.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}
              </p>
              <PremiumRequestActions userId={r.id} />
            </div>
          ))}
        </GlassCard>
      )}
      <form className="mg-admin-search" action="/admin/users">
        <label className="mg-visually-hidden" htmlFor="admin-q">
          Pesquisar por email
        </label>
        <input id="admin-q" name="q" type="search" placeholder="Pesquisar por email" defaultValue={q} />
        <button type="submit" className="mg-btn mg-btn--subtle">
          Pesquisar
        </button>
      </form>
      <GlassCard>
        <div className="mg-admin__scroll">
          <UserTable
            users={users.map((u) => ({
              ...u,
              onboarded: u.onboardedAt !== null,
            }))}
          />
        </div>
        <p className="mg-admin__note">
          {count} {count === 1 ? 'pessoa' : 'pessoas'} · página {page} de {pages}
          {page > 1 && (
            <>
              {' · '}
              <Link href={href(page - 1)}>anterior</Link>
            </>
          )}
          {page < pages && (
            <>
              {' · '}
              <Link href={href(page + 1)}>seguinte</Link>
            </>
          )}
        </p>
      </GlassCard>
    </>
  );
}
