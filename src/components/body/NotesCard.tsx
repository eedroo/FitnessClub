'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { saveNotes } from '@/actions/fitness';
import { Button } from '@/components/ui/Button';

/**
 * Notas de um programa, de um treino ou de um exercício (pessoais). Mostra o texto (com a marca "IA" quando foi
 * gerado pela IA); "Editar" abre a caixa de texto; vazio apaga.
 */
export function NotesCard({ kind, targetId, initial, byAi = false }: { kind: 'program' | 'workout' | 'exercise'; targetId: string; initial: string | null; byAi?: boolean }) {
  const t = useTranslations('fitness.notes');
  const te = useTranslations();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await saveNotes({ kind, targetId, text });
      if (!res.ok) return setError(te(res.error));
      setError(null);
      setEditing(false);
      router.refresh();
    });

  return (
    <section className="mg-notes" aria-label={t(`title.${kind}`)}>
      <div className="mg-notes__head">
        <h2 className="mg-notes__title">{t(`title.${kind}`)}</h2>
        {byAi && !editing && (
          <span className="mg-notes__ai">
            <Sparkles size={12} aria-hidden="true" /> {t('ai')}
          </span>
        )}
        {!editing && (
          <Button variant="subtle" onClick={() => setEditing(true)}>
            {initial ? t('edit') : t('add')}
          </Button>
        )}
      </div>
      {editing ? (
        <>
          <textarea
            className="mg-input mg-notes__input"
            value={text}
            maxLength={4000}
            rows={5}
            placeholder={t(`placeholder.${kind}`)}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          {error && (
            <p className="mg-form__status mg-form__status--error" role="alert">
              {error}
            </p>
          )}
          <div className="mg-notes__actions">
            <Button variant="subtle" onClick={() => { setText(initial ?? ''); setEditing(false); }}>
              {te('common.cancel')}
            </Button>
            <Button variant="ghost" loading={pending} onClick={save}>
              {te('common.save')}
            </Button>
          </div>
        </>
      ) : initial ? (
        <p className="mg-notes__text">{initial}</p>
      ) : (
        <p className="mg-notes__empty">{t(`empty.${kind}`)}</p>
      )}
    </section>
  );
}
