import { db } from '@/lib/db';
import { GEMINI_MODEL, hasAi } from '@/lib/ai/gemini';
import { PROGRAM_LIMIT_DAY, PROGRAM_LIMIT_MONTH } from '@/lib/ai/server';
import { GlassCard } from '@/components/ui/GlassCard';

/** IA: estado, custo deste mês e dos últimos 30 dias, por tipo e por pessoa (só email e totais; nunca o conteúdo). */
const usd = (micro: number) => `US$ ${(micro / 1_000_000).toFixed(micro < 10_000 ? 4 : 2)}`;

export default async function AdminAiPage() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const since30 = new Date(now.getTime() - 30 * 24 * 3600_000);
  const [month, byKind, byUser, failed] = await Promise.all([
    db.aiRequest.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { costMicroUsd: true, inputTokens: true, outputTokens: true },
      _count: { _all: true },
    }),
    db.aiRequest.groupBy({ by: ['kind'], where: { createdAt: { gte: since30 } }, _sum: { costMicroUsd: true }, _count: { _all: true } }),
    db.aiRequest.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since30 } },
      _sum: { costMicroUsd: true },
      _count: { _all: true },
      orderBy: { _sum: { costMicroUsd: 'desc' } },
      take: 50,
    }),
    db.aiRequest.count({ where: { createdAt: { gte: since30 }, status: 'FAILED' } }),
  ]);
  const users = await db.user.findMany({ where: { id: { in: byUser.map((u) => u.userId) } }, select: { id: true, email: true } });
  const email = new Map(users.map((u) => [u.id, u.email]));
  const kindLabel = { PROGRAM: 'Programas', INSIGHT: 'Retrospectivas' } as const;
  const n = (v: number | null) => (v ?? 0).toLocaleString('pt-PT');

  return (
    <>
      <h1 className="mg-admin__title">IA</h1>
      <GlassCard title="Estado">
        <p className="mg-admin__note">Chave do Gemini: {hasAi() ? 'configurada ✓' : 'em falta (GEMINI_API_KEY)'}</p>
        <p className="mg-admin__note">Modelo: {GEMINI_MODEL}. Recurso «ai» em Funcionalidades (por defeito só Premium).</p>
        <p className="mg-admin__note">
          Limites por pessoa: {PROGRAM_LIMIT_DAY} programas por dia, {PROGRAM_LIMIT_MONTH} por mês; uma retrospectiva por semana.
        </p>
      </GlassCard>
      <GlassCard title="Este mês">
        <p className="mg-admin__note">
          {month._count._all} pedidos · {usd(month._sum.costMicroUsd ?? 0)} · {n(month._sum.inputTokens)} tokens de entrada ·{' '}
          {n(month._sum.outputTokens)} de saída
        </p>
      </GlassCard>
      <GlassCard title="Últimos 30 dias">
        <table className="mg-admin-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th className="mg-admin-table__num">Pedidos</th>
              <th className="mg-admin-table__num">Custo</th>
            </tr>
          </thead>
          <tbody>
            {byKind.map((k) => (
              <tr key={k.kind}>
                <td>{kindLabel[k.kind]}</td>
                <td className="mg-admin-table__num">{k._count._all}</td>
                <td className="mg-admin-table__num">{usd(k._sum.costMicroUsd ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mg-admin__note">Falhados: {failed}</p>
      </GlassCard>
      <GlassCard title="Por pessoa (30 dias)">
        <table className="mg-admin-table">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th className="mg-admin-table__num">Pedidos</th>
              <th className="mg-admin-table__num">Custo</th>
            </tr>
          </thead>
          <tbody>
            {byUser.map((u) => (
              <tr key={u.userId}>
                <td>{email.get(u.userId) ?? u.userId}</td>
                <td className="mg-admin-table__num">{u._count._all}</td>
                <td className="mg-admin-table__num">{usd(u._sum.costMicroUsd ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </>
  );
}
