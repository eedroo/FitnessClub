'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { discardAiProgram, retryAiProgram, saveAiProgram } from '@/actions/ai';
import { Button } from '@/components/ui/Button';

/** Revisão do programa da IA: guardar (vai para o programa), pedir outro ou descartar. */
export function AiProgramActions({ requestId, canSave }: { requestId: string; canSave: boolean }) {
  const t = useTranslations('ai.program');
  const te = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<'save' | 'again' | 'discard' | null>(null);

  const run = (kind: 'save' | 'again' | 'discard') =>
    start(async () => {
      setWhich(kind);
      setError(null);
      if (kind === 'save') {
        const res = await saveAiProgram(requestId);
        if (!res.ok) return setError(te(res.error));
        router.push(`/programs/${res.data.programId}`);
      } else if (kind === 'again') {
        const res = await retryAiProgram(requestId);
        if (!res.ok) return setError(te(res.error));
        router.push(`/ai/program/${res.data.id}`);
      } else {
        await discardAiProgram(requestId);
        router.push('/');
      }
    });

  return (
    <div className="mg-ai-actions">
      {error && (
        <p className="mg-form__status mg-form__status--error" role="alert">
          {error}
        </p>
      )}
      {canSave && (
        <Button block loading={pending && which === 'save'} disabled={pending} onClick={() => run('save')}>
          {t('save')}
        </Button>
      )}
      <div className="mg-ai-actions__row">
        <Button variant="ghost" loading={pending && which === 'again'} disabled={pending} onClick={() => run('again')}>
          {t('again')}
        </Button>
        <Button variant="subtle" loading={pending && which === 'discard'} disabled={pending} onClick={() => run('discard')}>
          {t('discard')}
        </Button>
      </div>
    </div>
  );
}
