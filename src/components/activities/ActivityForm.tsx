'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteActivity, saveActivity } from '@/actions/activities';
import { ACTIVITY_GROUPS, ACTIVITY_KEYS, activityGroup, effortBand, hasDistance, type ActivityType } from '@/lib/activities/types';
import { normalizeSearch } from '@/lib/fitness/library';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { ActivityIcon } from './ActivityIcon';

export interface ActivityFormValue {
  id?: string;
  type: ActivityType | null;
  date: string;
  time: string;
  durationMin: number;
  effort: number | null;
  distanceKm: string;
  notes: string;
}

/**
 * Registar (ou editar) uma atividade: tipo (lista do app Saúde, com pesquisa e grupos), dia e hora, duração,
 * esforço 1–10, distância quando faz sentido e notas.
 */
export function ActivityForm({ initial, today }: { initial: ActivityFormValue; today: string }) {
  const t = useTranslations('activities');
  const te = useTranslations();
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [picking, setPicking] = useState(!initial.type);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ActivityFormValue>(k: K, val: ActivityFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const hours = Math.floor(v.durationMin / 60);
  const mins = v.durationMin % 60;

  const filtered = useMemo(() => {
    const n = normalizeSearch(q);
    return ACTIVITY_KEYS.filter((k) => !n || normalizeSearch(t(`types.${k}`)).includes(n));
  }, [q, t]);

  const save = () =>
    start(async () => {
      if (!v.type) return setError(t('errors.type'));
      const km = v.distanceKm.trim() ? Number(v.distanceKm.replace(',', '.')) : null;
      if (km != null && !Number.isFinite(km)) return setError(t('errors.invalid'));
      const res = await saveActivity({
        id: v.id,
        type: v.type,
        date: v.date,
        time: v.time,
        durationMin: v.durationMin,
        effort: v.effort,
        distanceKm: km,
        notes: v.notes,
      });
      if (!res.ok) return setError(te(res.error));
      router.push('/sessions');
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      if (!v.id || !window.confirm(t('deleteConfirm'))) return;
      await deleteActivity(v.id);
      router.push('/sessions');
      router.refresh();
    });

  if (picking)
    return (
      <div className="mg-activity-picker">
        <TextInput type="search" value={q} placeholder={t('search')} aria-label={t('search')} onChange={(e) => setQ(e.target.value)} autoFocus />
        {ACTIVITY_GROUPS.map((g) => {
          const list = filtered.filter((k) => activityGroup(k) === g);
          if (!list.length) return null;
          return (
            <section key={g} aria-label={t(`groups.${g}`)}>
              <h2 className="mg-body-section-title">{t(`groups.${g}`)}</h2>
              <ul className="mg-program-list">
                {list.map((k) => (
                  <li key={k}>
                    <button
                      type="button"
                      className="mg-program-row mg-activity-picker__row"
                      onClick={() => {
                        set('type', k);
                        setPicking(false);
                      }}
                    >
                      <ActivityIcon type={k} />
                      <span className="mg-program-row__name">{t(`types.${k}`)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {v.type && (
          <Button variant="ghost" onClick={() => setPicking(false)}>
            {te('common.cancel')}
          </Button>
        )}
      </div>
    );

  return (
    <div className="mg-activity-form">
      <button type="button" className="mg-program-row mg-activity-picker__row" onClick={() => setPicking(true)} aria-label={t('changeType')}>
        <ActivityIcon type={v.type!} size={22} />
        <span className="mg-program-row__text">
          <span className="mg-program-row__name">{t(`types.${v.type!}`)}</span>
          <span className="mg-program-row__meta">{t('changeType')}</span>
        </span>
      </button>

      <div className="mg-activity-form__grid">
        <label className="mg-activity-form__field">
          {t('date')}
          <input className="mg-input" type="date" value={v.date} max={today} onChange={(e) => set('date', e.target.value)} />
        </label>
        <label className="mg-activity-form__field">
          {t('time')}
          <input className="mg-input" type="time" value={v.time} onChange={(e) => set('time', e.target.value)} />
        </label>
        <label className="mg-activity-form__field">
          {t('hours')}
          <input
            className="mg-input"
            type="number"
            inputMode="numeric"
            min={0}
            max={23}
            value={hours}
            onChange={(e) => set('durationMin', Math.max(0, Math.min(23, Number(e.target.value) || 0)) * 60 + mins)}
          />
        </label>
        <label className="mg-activity-form__field">
          {t('minutes')}
          <input
            className="mg-input"
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={mins}
            onChange={(e) => set('durationMin', hours * 60 + Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
          />
        </label>
        {hasDistance(v.type!) && (
          <label className="mg-activity-form__field mg-activity-form__field--wide">
            {t('distance')}
            <input
              className="mg-input"
              inputMode="decimal"
              placeholder="5,0"
              value={v.distanceKm}
              onChange={(e) => set('distanceKm', e.target.value.replace(/[^\d.,]/g, '').slice(0, 7))}
            />
          </label>
        )}
      </div>

      <fieldset className="mg-activity-form__effort">
        <legend>{t('effort')}</legend>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={v.effort ?? 5}
          aria-valuetext={v.effort ? `${v.effort} · ${t(`effortBands.${effortBand(v.effort)}`)}` : t('effortNone')}
          onChange={(e) => set('effort', Number(e.target.value))}
        />
        <span className="mg-activity-form__effort-value">
          {v.effort ? `${v.effort} · ${t(`effortBands.${effortBand(v.effort)}`)}` : t('effortNone')}
        </span>
      </fieldset>

      <label className="mg-activity-form__field mg-activity-form__field--wide">
        {t('notes')}
        <textarea className="mg-input mg-notes__input" rows={3} maxLength={1000} value={v.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>

      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <Button block loading={pending} disabled={v.durationMin < 1} onClick={save}>
        {te('common.save')}
      </Button>
      {v.id && (
        <Button variant="danger" block disabled={pending} onClick={remove}>
          {t('delete')}
        </Button>
      )}
    </div>
  );
}
