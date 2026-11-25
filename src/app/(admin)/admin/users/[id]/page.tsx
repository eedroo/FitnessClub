import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getEntitlements } from '@/lib/entitlements/server';
import { FEATURE_KEYS } from '@/lib/entitlements/features';
import { GlassCard } from '@/components/ui/GlassCard';
import { AdminTable } from '@/components/admin/AdminTable';
import { planLabel } from '@/components/admin/UserTable';
import { UserPlanForm } from '@/components/admin/UserPlanForm';
import { FeatureOverrideRow } from '@/components/admin/FeatureOverrideRow';
import { AiUserActions } from '@/components/admin/AiUserActions';
import { getAiAccess, programQuota, PROGRAM_LIMIT_DAY, PROGRAM_LIMIT_MONTH } from '@/lib/ai/server';

const date = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '–');

/** Ficha de uma pessoa: dados da conta (sem treinos nem peso), plano, IA (estado, pedidos, repor e gerar de novo) e excepções por funcionalidade. */
export default async function AdminUserPage({ params }: { params: { id: string } }) {
  const user = await db.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, email: true, name: true, createdAt: true, lastActiveAt: true, plan: true, planSource: true, planSince: true,
      planExpiresAt: true, onboardedAt: true, locale: true,
      featureOverrides: { select: { key: true, enabled: true } },
      _count: { select: { activeDays: true } },
    },
  });
  if (!user) notFound();
  const [ent, access, quota, requests, extra] = await Promise.all([
    getEntitlements(user.id),
    getAiAccess(user.id),
    programQuota(user.id),
    db.aiRequest.findMany({
      where: { userId: user.id, kind: 'PROGRAM' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, status: true, error: true, createdAt: true },
    }),
    db.user.findUnique({ where: { id: user.id }, select: { aiConsentAt: true, aiQuotaResetAt: true } }),
  ]);
  const statusLabel = { PENDING: 'A gerar', DONE: 'Pronto (por guardar)', APPLIED: 'Guardado', DISCARDED: 'Descartado', FAILED: 'Falhou' } as const;
  const overrides = new Map(user.featureOverrides.map((o) => [o.key, o.enabled]));

  return (
    <>
      <p className="mg-admin__note">
        <Link href="/admin/users">← Utilizadores</Link>
      </p>
      <h1 className="mg-admin__title">{user.email}</h1>
      <GlassCard title="Conta">
        <AdminTable
          caption="Dados da conta"
          columns={[
            { key: 'k', label: 'Campo' },
            { key: 'v', label: 'Valor' },
          ]}
          rows={[
            { k: 'Nome', v: user.name },
            { k: 'Língua', v: user.locale },
            { k: 'Criado', v: date(user.createdAt) },
            { k: 'Última actividade', v: date(user.lastActiveAt) },
            { k: 'Dias com actividade', v: user._count.activeDays },
            { k: 'Plano', v: planLabel(user) },
            { k: 'Premium desde', v: date(user.planSince) },
            { k: 'Boas-vindas', v: user.onboardedAt ? date(user.onboardedAt) : 'Não' },
          ]}
        />
      </GlassCard>
      <GlassCard title="Plano">
        <UserPlanForm
          userId={user.id}
          plan={user.plan}
          source={user.planSource === 'GIFT' ? 'GIFT' : 'MANUAL'}
          expiresAt={user.planExpiresAt ? date(user.planExpiresAt) : null}
        />
      </GlassCard>
      <GlassCard title="IA (programas)">
        <p className="mg-admin__note">
          Acesso: {access.feature ? 'sim' : 'não (precisa de Premium)'} · Consentimento: {extra?.aiConsentAt ? date(extra.aiConsentAt) : 'ainda não deu'} ·
          Chave: {access.configured ? 'ok' : 'em falta'}
        </p>
        <p className="mg-admin__note">
          Tentativas: {quota.day} hoje (máx. {PROGRAM_LIMIT_DAY}), {quota.month} em 30 dias (máx. {PROGRAM_LIMIT_MONTH}) ·{' '}
          {quota.allowed ? 'pode pedir' : 'no limite'}
          {extra?.aiQuotaResetAt ? ` · repostas a ${date(extra.aiQuotaResetAt)}` : ''}. Pedidos que falham não contam.
        </p>
        {requests.length > 0 && (
          <table className="mg-admin-table">
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.createdAt.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}</td>
                  <td>{statusLabel[r.status]}</td>
                  <td>{r.error ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mg-admin__note">
          «Gerar de novo» repete o último pedido dela com as mesmas respostas, fora do limite. «Repor tentativas» volta a pôr o limite a zero.
        </p>
        <AiUserActions userId={user.id} />
      </GlassCard>
      <GlassCard title="Funcionalidades">
        {FEATURE_KEYS.map((key) => (
          <FeatureOverrideRow key={key} userId={user.id} featureKey={key} override={overrides.get(key) ?? null} effective={ent.features[key]} />
        ))}
      </GlassCard>
    </>
  );
}
