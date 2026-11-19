import { db } from '@/lib/db';
import { GlassCard } from '@/components/ui/GlassCard';
import { ReportActions } from '@/components/admin/ReportActions';

const REASON: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Assédio',
  hate: 'Ódio',
  nudity: 'Nudez',
  violence: 'Violência',
  self_harm: 'Auto-lesão',
  misinformation: 'Desinformação',
  other: 'Outro',
};

/** Denúncias abertas da comunidade, com o conteúdo denunciado (só o necessário para moderar). */
export default async function AdminReportsPage() {
  const reports = await db.report.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: 'asc' }, take: 100 });
  const postIds = reports.filter((r) => r.target === 'POST').map((r) => r.targetId);
  const commentIds = reports.filter((r) => r.target === 'COMMENT').map((r) => r.targetId);
  const userIds = reports.filter((r) => r.target === 'USER').map((r) => r.targetId);
  const [posts, comments, users] = await Promise.all([
    db.post.findMany({ where: { id: { in: postIds } }, select: { id: true, text: true, hiddenAt: true, author: { select: { socialProfile: { select: { handle: true } } } } } }),
    db.postComment.findMany({ where: { id: { in: commentIds } }, select: { id: true, text: true, hiddenAt: true, author: { select: { socialProfile: { select: { handle: true } } } } } }),
    db.socialProfile.findMany({ where: { userId: { in: userIds } }, select: { userId: true, handle: true, displayName: true, bio: true } }),
  ]);
  const P = new Map(posts.map((p) => [p.id, p]));
  const C = new Map(comments.map((c) => [c.id, c]));
  const U = new Map(users.map((u) => [u.userId, u]));
  return (
    <>
      <h1 className="mg-admin__title">Denúncias</h1>
      {!reports.length && <p className="mg-admin__note">Sem denúncias por ver.</p>}
      {reports.map((r) => {
        const item = r.target === 'POST' ? P.get(r.targetId) : r.target === 'COMMENT' ? C.get(r.targetId) : null;
        const user = r.target === 'USER' ? U.get(r.targetId) : null;
        return (
          <GlassCard key={r.id} title={`${r.target === 'POST' ? 'Post' : r.target === 'COMMENT' ? 'Comentário' : 'Pessoa'} · ${REASON[r.reason] ?? r.reason}`}>
            <p className="mg-admin__note">{r.createdAt.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}</p>
            {item && (
              <p className="mg-admin__note">
                @{item.author.socialProfile?.handle ?? '?'}: {item.text ?? '(sem texto: treino partilhado)'} {item.hiddenAt ? '· escondido' : ''}
              </p>
            )}
            {user && (
              <p className="mg-admin__note">
                @{user.handle} · {user.displayName} {user.bio ? `· ${user.bio}` : ''}
              </p>
            )}
            {!item && !user && <p className="mg-admin__note">O conteúdo já foi apagado.</p>}
            <ReportActions reportId={r.id} target={r.target} targetId={r.targetId} hidden={!!item?.hiddenAt} />
          </GlassCard>
        );
      })}
    </>
  );
}
