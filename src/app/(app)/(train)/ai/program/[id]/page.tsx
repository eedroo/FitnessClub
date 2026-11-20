import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { exerciseName, type ExerciseNames } from '@/lib/fitness/library';
import { aiProgramSchema } from '@/lib/ai/program';
import { AI_JOB_TIMEOUT_MS } from '@/lib/ai/server';
import { BodyHeader } from '@/components/body/BodyHeader';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { AiPendingRefresh } from '@/components/ai/AiPendingRefresh';
import { AiProgramActions } from '@/components/ai/AiProgramActions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ai.program');
  return { title: t('title') };
}

/** Revisão do programa proposto pela IA: à espera do job, falhou, ou pronto para guardar. */
export default async function AiProgramPage({ params }: { params: { id: string } }) {
  const { userId, locale } = await bodyPage();
  const [t, tf, req] = await Promise.all([
    getTranslations('ai.program'),
    getTranslations('fitness'),
    db.aiRequest.findFirst({ where: { id: params.id, userId, kind: 'PROGRAM' }, select: { id: true, status: true, result: true, createdAt: true } }),
  ]);
  if (!req || req.status === 'DISCARDED') notFound();
  // Job que nunca respondeu (Inngest sem chegar à app, por exemplo): ao fim de 75 s passa a falhado.
  if (req.status === 'PENDING' && Date.now() - req.createdAt.getTime() > AI_JOB_TIMEOUT_MS) {
    await db.aiRequest.updateMany({ where: { id: req.id, status: 'PENDING' }, data: { status: 'FAILED', error: 'sem resposta do job', finishedAt: new Date() } });
    req.status = 'FAILED';
  }
  if (req.status === 'APPLIED') {
    const programId = (req.result as { programId?: string } | null)?.programId;
    redirect(programId ? `/programs/${programId}` : '/');
  }

  const header = <BodyHeader title={t('reviewTitle')} backHref="/" backLabel={tf('nav.workouts')} />;

  if (req.status === 'PENDING')
    return (
      <>
        {header}
        <div className="mg-body-shell__main">
          <div className="mg-ai-wait" role="status" aria-live="polite">
            <span className="mg-ai-wait__icon" aria-hidden="true">
              <MagicIcon name="sparkles" size="md" decorative />
            </span>
            <p className="mg-ai-wait__title">{t('pendingTitle')}</p>
            <p className="mg-ai-wait__text">{t('pendingText')}</p>
          </div>
          <AiPendingRefresh />
        </div>
      </>
    );

  const parsed = req.status === 'DONE' ? aiProgramSchema.safeParse(req.result) : null;
  if (!parsed?.success)
    return (
      <>
        {header}
        <div className="mg-body-shell__main">
          <div className="mg-ai-wait" role="alert">
            <p className="mg-ai-wait__title">{t('failedTitle')}</p>
            <p className="mg-ai-wait__text">{t('failedText')}</p>
          </div>
          <AiProgramActions requestId={req.id} canSave={false} />
        </div>
      </>
    );

  const program = parsed.data;
  const exercises = await db.exercise.findMany({
    where: { id: { in: program.workouts.flatMap((w) => w.items.map((i) => i.exerciseId)) } },
    select: { id: true, names: true },
  });
  const names = new Map(exercises.map((e) => [e.id, exerciseName(e.names as ExerciseNames, locale)]));
  const target = (i: (typeof program.workouts)[number]['items'][number]) => {
    const reps = i.sec ? `${i.sec} s` : i.repsMin === i.repsMax ? `${i.repsMin}` : `${i.repsMin}–${i.repsMax}`;
    return [`${i.sets} × ${reps}`, i.restSec ? t('rest', { sec: i.restSec }) : null].filter(Boolean).join(' · ');
  };

  return (
    <>
      {header}
      <div className="mg-body-shell__main">
        <div className="mg-ai-program">
          <h2 className="mg-ai-program__name">{program.name}</h2>
          {program.description && <p className="mg-ai-program__desc">{program.description}</p>}
          {program.notes && <p className="mg-ai-program__notes">{program.notes}</p>}
        </div>
        {program.workouts.map((w, wi) => (
          <section key={wi} className="mg-ai-workout" aria-label={w.name}>
            <h3 className="mg-ai-workout__name">{w.name}</h3>
            {w.notes && <p className="mg-ai-workout__notes">{w.notes}</p>}
            <ol className="mg-ai-workout__items">
              {w.items.map((i) => (
                <li key={i.exerciseId} className="mg-ai-workout__item">
                  <span className="mg-ai-workout__row">
                    <span className="mg-ai-workout__ex">{names.get(i.exerciseId) ?? i.exerciseId}</span>
                    <span className="mg-ai-workout__target">{target(i)}</span>
                  </span>
                  {(i.note || i.cue) && <span className="mg-ai-workout__note">{[i.note, i.cue].filter(Boolean).join(' ')}</span>}
                </li>
              ))}
            </ol>
          </section>
        ))}
        <p className="mg-ai-program__hint">{t('reviewHint')}</p>
        <AiProgramActions requestId={req.id} canSave />
      </div>
    </>
  );
}
