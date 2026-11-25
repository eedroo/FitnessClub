import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { countCustomExercises, getTrainingProfile, listPrograms } from '@/lib/fitness/queries';
import { FITNESS_TEMPLATES } from '@/lib/fitness/templates';
import { BodyHeader } from '@/components/body/BodyHeader';
import { ProgramList } from '@/components/body/ProgramList';
import { ProgramForm } from '@/components/body/ProgramForm';
import { StartSessionButton } from '@/components/body/StartSessionButton';
import { db } from '@/lib/db';
import { getAiAccess } from '@/lib/ai/server';
import { getGamification } from '@/lib/gamification/server';
import { LevelCard } from '@/components/gamification/LevelCard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness');
  return { title: t('title') };
}

/** Treinos: programas, os meus exercícios e um treino livre (as boas-vindas são o onboarding, em `/welcome`). */
export default async function BodyHome() {
  const { userId } = await bodyPage();
  const [t, ti, ta, ta2, programs, custom, profile, ai, insight, game] = await Promise.all([
    getTranslations('fitness'),
    getTranslations('ai.insights'),
    getTranslations('activities'),
    getTranslations('ai.program'),
    listPrograms(userId),
    countCustomExercises(userId),
    getTrainingProfile(userId),
    getAiAccess(userId),
    db.aiRequest.findFirst({
      where: { userId, kind: 'INSIGHT', status: 'DONE' },
      orderBy: { weekStart: 'desc' },
      select: { id: true, result: true, readAt: true },
    }),
    getGamification(userId),
  ]);
  // Programa com IA pronto para rever (ou a ser gerado, ex.: pedido de novo pelo admin): leva à revisão.
  const aiReady = await db.aiRequest.findFirst({
    where: { userId, kind: 'PROGRAM', OR: [{ status: 'DONE' }, { status: 'PENDING', createdAt: { gte: new Date(Date.now() - 10 * 60_000) } }] },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  });
  const premiumRequested = !ai.feature && !!(await db.user.findUnique({ where: { id: userId }, select: { premiumRequestedAt: true } }))?.premiumRequestedAt;
  const insightHeadline = (insight?.result as { headline?: string } | null)?.headline;
  const templates = FITNESS_TEMPLATES.map((tpl) => ({ id: tpl.id, name: t(`templates.${tpl.id}.name`), description: t(`templates.${tpl.id}.description`) }));

  return (
    <>
      <BodyHeader title={t('title')} />
      <div className="mg-body-shell__main">
        {/* Cabeçalho: nível e barra de XP. Depois: programas, novo programa, os meus exercícios e a retrospectiva. */}
        <LevelCard summary={game.summary} href="/achievements" />
        {aiReady && (
          <Link href={`/ai/program/${aiReady.id}`} className="mg-program-form__ai-link">
            <span className="mg-ai-card__text">
              <span className="mg-ai-card__title">{ta2(aiReady.status === 'DONE' ? 'ready.title' : 'ready.pending')}</span>
              <span className="mg-ai-card__meta">{ta2(aiReady.status === 'DONE' ? 'ready.text' : 'ready.pendingText')}</span>
            </span>
          </Link>
        )}
        <h2 className="mg-body-section-title">{t('home.programs')}</h2>
        <ProgramList programs={programs} />
        <ProgramForm templates={templates} ai={{ feature: ai.feature, available: ai.feature && ai.configured, premiumRequested }} />
        <Link href="/exercises?tab=mine" className="mg-program-row">
          <span className="mg-program-row__text">
            <span className="mg-program-row__name">{t('home.myExercises', { n: custom })}</span>
            <span className="mg-program-row__meta">{t('home.myExercisesHint')}</span>
          </span>
        </Link>
        {/* Retrospectiva da semana (IA): a mais recente, com ponto azul enquanto não foi lida. */}
        {ai.feature && (
          <Link href={insight && !insight.readAt ? `/insights/${insight.id}` : '/insights'} className="mg-program-row">
            <span className="mg-program-row__text">
              <span className="mg-program-row__name">
                {insight && !insight.readAt && <span className="mg-ai-dot" aria-label={ti('unread')} />}
                {ti('title')}
              </span>
              <span className="mg-program-row__meta">{insightHeadline ?? ti('homeText')}</span>
            </span>
          </Link>
        )}
        <StartSessionButton workoutId={null} label={t('home.freeWorkout')} variant="subtle" />
        <Link href="/activities/new" className="mg-btn mg-btn--subtle mg-btn--block">
          {ta('add')}
        </Link>
      </div>
    </>
  );
}
