import Link from 'next/link';
import { db } from '@/lib/db';
import { getAdminMetrics } from '@/lib/metrics/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MetricCard } from '@/components/admin/MetricCard';
import { ActivityBars } from '@/components/admin/ActivityBars';

/** Métricas de produto, calculadas a pedido a partir da base de dados (só totais). */
export default async function AdminMetricsPage() {
  const [m, requests] = await Promise.all([getAdminMetrics(), db.user.count({ where: { premiumRequestedAt: { not: null }, plan: 'FREE' } })]);
  const n = (v: number) => v.toLocaleString('pt-PT');
  return (
    <>
      <h1 className="mg-admin__title">Métricas</h1>
      <p className="mg-admin__note">Dias em UTC.</p>
      {requests > 0 && (
        <p className="mg-admin__note">
          <Link href="/admin/users">
            {requests} {requests === 1 ? 'pedido' : 'pedidos'} de Premium por tratar
          </Link>
        </p>
      )}

      <GlassCard title="Utilizadores">
        <div className="mg-admin__tiles">
          <MetricCard value={n(m.users.total)} label="Contas" />
          <MetricCard value={n(m.users.new7)} label="Novos em 7 dias" />
          <MetricCard value={n(m.users.new30)} label="Novos em 30 dias" />
          <MetricCard value={n(m.users.premium)} label="Premium" />
        </div>
      </GlassCard>

      <GlassCard title="Actividade">
        <div className="mg-admin__tiles">
          <MetricCard value={n(m.activity.dau)} label="DAU" hint="hoje" />
          <MetricCard value={n(m.activity.wau)} label="WAU" hint="7 dias" />
          <MetricCard value={n(m.activity.mau)} label="MAU" hint="30 dias" />
          <MetricCard value={`${Math.round(m.activity.stickiness * 100)}%`} label="Stickiness" hint="DAU / MAU" />
        </div>
        <ActivityBars days={m.activity.byDay} />
      </GlassCard>
    </>
  );
}
