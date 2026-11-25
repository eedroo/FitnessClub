import { GlassCard } from '@/components/ui/GlassCard';
import { BotActions } from '@/components/admin/BotActions';
import { botStatus, getBotSettings } from '@/lib/bots/server';
import { BOTS } from '@/lib/bots/roster';
import { levelsFor } from '@/lib/gamification/server';
import { leagueOf } from '@/lib/social/leagues';

/** Bots (contas de demonstração): estado, nível e liga de cada um, e os botões. */
export default async function AdminBotsPage() {
  const [bots, settings] = await Promise.all([botStatus(), getBotSettings()]);
  const levels = await levelsFor(bots.map((b) => b.id));
  const league = { bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', platinum: 'Platina', diamond: 'Diamante' } as const;
  return (
    <>
      <h1 className="mg-admin__title">Bots</h1>
      <GlassCard title="Estado">
        <p className="mg-admin__note">
          {bots.length ? `${bots.length} bots · ${settings.visible ? 'visíveis' : 'ocultos'}` : `Ainda sem bots (${BOTS.length} prontos a criar: 5 no Bronze, nível 1, e 4 na Prata, nível 7).`}
        </p>
        <p className="mg-admin__note">
          Aparecem como perfis normais no feed e no ranking (Bronze e Prata) e competem a sério: podem ganhar o pódio da semana. Não
          entram nas métricas, não fazem login e aceitam os pedidos de amizade. Todos os dias ao meio-dia de Lisboa (Inngest «bots-daily»)
          cada um treina ao acaso, ao seu ritmo, com progressão dupla, e às vezes publica. Ocultos: somem de todo o lado e param.
        </p>
        <BotActions count={bots.length} visible={settings.visible} />
      </GlassCard>
      {bots.length > 0 && (
        <GlassCard title="Os bots">
          <table className="mg-admin-table">
            <thead>
              <tr>
                <th>Bot</th>
                <th>Liga</th>
                <th className="mg-admin-table__num">Treinos</th>
                <th className="mg-admin-table__num">Posts</th>
                <th>Último treino</th>
              </tr>
            </thead>
            <tbody>
              {bots.map((b) => {
                const lvl = levels.get(b.id) ?? 1;
                return (
                  <tr key={b.id}>
                    <td>
                      {b.name} · @{b.handle}
                    </td>
                    <td>
                      {league[leagueOf(lvl)]} · nível {lvl}
                    </td>
                    <td className="mg-admin-table__num">{b.sessions}</td>
                    <td className="mg-admin-table__num">{b.posts}</td>
                    <td>{b.lastAt ? b.lastAt.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </GlassCard>
      )}
    </>
  );
}
