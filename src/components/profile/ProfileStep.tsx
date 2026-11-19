'use client';

import { useTranslations } from 'next-intl';
import { MAP_MUSCLES, type MapMuscle, type Recovery } from '@/lib/body/muscles';
import { ANTERIOR_SHAPES, POSTERIOR_SHAPES } from '@/lib/body/mapShapes';
import { EQUIPMENT, GOALS, LEVELS, SESSION_MINUTES, type TrainingProfileData } from '@/lib/fitness/profile';
import { TextInput } from '@/components/ui/TextInput';
import { BodyView } from '@/components/body/MuscleMap';

export type ProfileStepId = 'goals' | 'level' | 'weight' | 'equipment' | 'focus' | 'days' | 'wishes';

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/**
 * Uma pergunta do perfil de treino: objectivos, nível, peso, equipamento, músculos em foco (no mapa), dias e duração,
 * pedidos e o que evitar. Controlado: o valor e as mudanças vêm de quem o usa (boas-vindas ou página do perfil).
 */
export function ProfileStep({
  id,
  value,
  onChange,
  weightKg,
  onWeightKg,
  weightAllowed,
}: {
  id: ProfileStepId;
  value: TrainingProfileData;
  onChange: (v: TrainingProfileData) => void;
  weightKg: string;
  onWeightKg: (v: string) => void;
  weightAllowed: boolean;
}) {
  const t = useTranslations('fitness.profile');
  const tm = useTranslations('body.map');
  const set = <K extends keyof TrainingProfileData>(k: K, v: TrainingProfileData[K]) => onChange({ ...value, [k]: v });

  const option = (active: boolean, label: string, onClick: () => void, hint?: string, role: 'checkbox' | 'radio' = 'checkbox') => (
    <button
      key={label}
      type="button"
      role={role}
      aria-checked={active}
      className={active ? 'mg-body-welcome__option mg-body-welcome__option--active' : 'mg-body-welcome__option'}
      onClick={onClick}
    >
      <strong>{label}</strong>
      {hint && <span>{hint}</span>}
    </button>
  );

  return (
    <section className="mg-body-welcome__step mg-profile-step" aria-live="polite">
      <h2 className="mg-body-welcome__title">{t(`steps.${id}.title`)}</h2>
      <p className="mg-body-welcome__text">{t(`steps.${id}.text`)}</p>

      {id === 'goals' && (
        <div className="mg-body-welcome__options" role="group" aria-label={t('steps.goals.title')}>
          {GOALS.map((g) => option(value.goals.includes(g), t(`goals.${g}`), () => set('goals', toggle(value.goals, g))))}
        </div>
      )}

      {id === 'level' && (
        <div className="mg-body-welcome__options mg-body-welcome__options--list" role="radiogroup" aria-label={t('steps.level.title')}>
          {LEVELS.map((l) => option(value.level === l, t(`levels.${l}.name`), () => set('level', l), t(`levels.${l}.hint`), 'radio'))}
        </div>
      )}

      {id === 'weight' &&
        (weightAllowed ? (
          <label className="mg-profile-step__weight">
            <TextInput inputMode="decimal" value={weightKg} placeholder="72,5" maxLength={6} onChange={(e) => onWeightKg(e.target.value)} aria-label={t('steps.weight.title')} />
            <span>kg</span>
          </label>
        ) : (
          <p className="mg-body-empty">{t('steps.weight.noConsent')}</p>
        ))}

      {id === 'equipment' && (
        <div className="mg-body-welcome__options mg-body-welcome__options--list" role="group" aria-label={t('steps.equipment.title')}>
          {EQUIPMENT.map((e) => option(value.equipment.includes(e), t(`equipment.${e}.name`), () => set('equipment', toggle(value.equipment, e)), t(`equipment.${e}.hint`)))}
        </div>
      )}

      {id === 'focus' && (
        <>
          <div className="mg-muscle-map__views mg-profile-step__map">
            {[
              { shapes: ANTERIOR_SHAPES, label: tm('front') },
              { shapes: POSTERIOR_SHAPES, label: tm('back') },
            ].map((v) => (
              <BodyView
                key={v.label}
                shapes={v.shapes}
                label={v.label}
                recovery={Object.fromEntries(MAP_MUSCLES.map((m) => [m, value.focusMuscles.includes(m) ? 'just-trained' : 'rested'])) as Record<MapMuscle, Recovery>}
                selected={null}
                onPick={(m) => set('focusMuscles', toggle(value.focusMuscles, m))}
                describe={(m) => `${tm(`muscles.${m}`)}: ${value.focusMuscles.includes(m) ? t('steps.focus.on') : t('steps.focus.off')}`}
              />
            ))}
          </div>
          <p className="mg-profile-step__chosen">
            {value.focusMuscles.length ? value.focusMuscles.map((m) => tm(`muscles.${m}`)).join(' · ') : t('steps.focus.none')}
          </p>
        </>
      )}

      {id === 'days' && (
        <>
          <div className="mg-profile-step__days" role="group" aria-label={t('steps.days.title')}>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <button
                key={d}
                type="button"
                role="checkbox"
                aria-checked={value.trainingDays.includes(d)}
                aria-label={t(`days.long.${d}`)}
                className={value.trainingDays.includes(d) ? 'mg-profile-step__day mg-profile-step__day--on' : 'mg-profile-step__day'}
                onClick={() => set('trainingDays', toggle(value.trainingDays, d).sort((a, b) => a - b))}
              >
                {t(`days.short.${d}`)}
              </button>
            ))}
          </div>
          <p className="mg-profile-step__chosen">{t('steps.days.count', { n: value.trainingDays.length })}</p>
          <h3 className="mg-body-section-title">{t('steps.days.minutes')}</h3>
          <div className="mg-body-welcome__options" role="radiogroup" aria-label={t('steps.days.minutes')}>
            {SESSION_MINUTES.map((m) => option(value.sessionMinutes === m, t('minutes', { n: m }), () => set('sessionMinutes', m), undefined, 'radio'))}
          </div>
        </>
      )}

      {id === 'wishes' && (
        <>
          <label className="mg-profile-step__field">
            <span>{t('steps.wishes.wishesLabel')}</span>
            <textarea className="mg-input mg-notes__input" rows={4} maxLength={2000} value={value.wishes ?? ''} placeholder={t('steps.wishes.wishesPlaceholder')} onChange={(e) => set('wishes', e.target.value)} />
          </label>
          <label className="mg-profile-step__field">
            <span>{t('steps.wishes.avoidLabel')}</span>
            <textarea className="mg-input mg-notes__input" rows={3} maxLength={2000} value={value.avoid ?? ''} placeholder={t('steps.wishes.avoidPlaceholder')} onChange={(e) => set('avoid', e.target.value)} />
          </label>
        </>
      )}
    </section>
  );
}
