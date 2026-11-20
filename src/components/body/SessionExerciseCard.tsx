'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { prefillSet } from '@/lib/fitness/session';
import { suggestProgression } from '@/lib/fitness/progression';
import { compareWithPrevious, summarize } from '@/lib/fitness/progress';
import { CompareCard } from './CompareCard';
import { mergeBest, strengthLevel, type StrengthBest } from '@/lib/gamification/strength';
import { StrengthTier } from '@/components/gamification/StrengthTier';
import type { ActiveSessionView } from '@/lib/fitness/types';
import { SetInputRow, SetRow, useKg, type SetValues } from './SetRow';
import { useTargetText } from './WorkoutItemRow';

type Item = ActiveSessionView['items'][number];
export interface ShownSet extends SetValues {
  id: string;
  pending: boolean;
  prKinds: string[];
  fresh: boolean;
  /** Quando foi feita (ISO). */
  at?: string;
}

/** Um exercício na sessão: alvo, "Última vez", séries feitas e a próxima. */
export function SessionExerciseCard({
  item,
  sets,
  current,
  strength,
  onLog,
  onUpdate,
  onDelete,
}: {
  item: Item;
  sets: ShownSet[];
  /** Em foco: o exercício que se está a fazer (passa ao seguinte quando as séries do alvo estão feitas). */
  current: boolean;
  /** Para o selo do nível de força (muda logo que uma série nova o faz subir). */
  strength?: { bodyGrams: number | null; best: StrengthBest | undefined };
  onLog: (v: SetValues) => string | null;
  onUpdate: (setId: string, v: SetValues) => Promise<string | null>;
  onDelete: (setId: string) => Promise<void>;
}) {
  const t = useTranslations('fitness.session');
  const target = useTargetText();
  const kg = useKg();
  const { exercise } = item;
  const hasTarget = item.target.sets != null || item.target.repsMin != null || item.target.sec != null;
  const last = item.last
    ? item.last.sets
        .map((s) =>
          s.durationSec != null
            ? t('secondsShort', { n: s.durationSec })
            : s.weightGrams != null
              ? `${t('kgShort', { kg: kg(s.weightGrams) })} × ${s.reps ?? 0}`
              : String(s.reps ?? ''),
        )
        .join(', ')
    : null;
  // O foco acabou de passar para este exercício: traz o cartão para a vista (não na primeira abertura).
  const ref = useRef<HTMLElement>(null);
  const was = useRef(current);
  useEffect(() => {
    if (current && !was.current) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    was.current = current;
  }, [current]);
  // Progressão dupla: o que fazer hoje (uma rep a mais que a última vez, ou mais carga com tudo no topo do alvo).
  const suggestion = suggestProgression({ measure: exercise.measure, equipment: exercise.equipment, last: item.last, target: item.target });
  const suggested = suggestion?.sets[sets.length];
  const prefill = suggested
    ? { reps: suggested.reps, ...(suggested.weightGrams != null && { weightGrams: suggested.weightGrams }) }
    : prefillSet({ doneInSession: sets.map((s) => ({ exerciseId: exercise.id, ...s })), last: item.last, target: item.target });
  const plan = suggestion
    ? suggestion.sets.map((s) => s.reps).join(' · ') + (suggestion.sets[0]?.weightGrams != null ? ` × ${t('kgShort', { kg: kg(suggestion.sets[0].weightGrams) })}` : '')
    : null;

  const tier = strength
    ? (strengthLevel(exercise.id, sets.reduce<StrengthBest>((b, s) => mergeBest(b, { reps: s.reps ?? null, weightGrams: s.weightGrams ?? null, durationSec: s.durationSec ?? null }), strength.best ?? { e1rmGrams: null, maxReps: null }), strength.bodyGrams)?.tier ?? null)
    : null;

  return (
    <article ref={ref} className={`mg-session-ex${current ? ' mg-session-ex--current' : ''}`} aria-current={current ? 'step' : undefined}>
      <h2 className="mg-session-ex__name">
        <Link href={`/exercises/${encodeURIComponent(exercise.id)}`}>{exercise.name}</Link>
        <StrengthTier tier={tier} compact />
      </h2>
      {hasTarget && (
        <p className="mg-session-ex__target">
          {target({ targetSets: item.target.sets, targetRepsMin: item.target.repsMin, targetRepsMax: item.target.repsMax, targetSec: item.target.sec }, item.target.restSec)}
        </p>
      )}
      {last && <p className="mg-session-ex__last">{t('lastTime', { sets: last })}</p>}
      {item.note && <p className="mg-session-ex__note">{item.note}</p>}
      {suggestion && plan && (
        <p className={`mg-session-ex__suggest mg-session-ex__suggest--${suggestion.kind}`}>
          <strong>{t(`suggest.${suggestion.kind}`)}</strong> {plan}
        </p>
      )}
      {/* Assim que há uma série: comparado com a última vez. */}
      {sets.length > 0 && item.last && <CompareCard comparison={compareWithPrevious(summarize(sets), summarize(item.last.sets.map((x) => ({ reps: x.reps ?? undefined, weightGrams: x.weightGrams ?? undefined, durationSec: x.durationSec ?? undefined }))))} />}
      {sets.length > 0 && (
        <ol className="mg-session-ex__sets">
          {sets.map((s, i) => (
            <SetRow
              key={s.id}
              n={i + 1}
              measure={exercise.measure}
              values={s}
              pending={s.pending}
              prKinds={s.prKinds}
              fresh={s.fresh}
              at={s.at ?? null}
              onSave={(v) => onUpdate(s.id, v)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </ol>
      )}
      <SetInputRow measure={exercise.measure} prefill={prefill} onDone={onLog} />
    </article>
  );
}
