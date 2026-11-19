'use client';

import { useMemo, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createInvite, searchPlaces } from '@/actions/invites';
import { ACTIVITY_GROUPS, ACTIVITY_KEYS, activityGroup } from '@/lib/activities/types';
import type { Place } from '@/lib/social/invites';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextInput } from '@/components/ui/TextInput';

const InviteMap = dynamic(() => import('./InviteMap').then((m) => m.InviteMap), { ssr: false });

/** Marcar um treino: o quê, quando, onde (pesquisa no mapa), para quem e quantas pessoas. */
export function InviteForm({ today, friends }: { today: string; friends: { userId: string; handle: string; displayName: string }[] }) {
  const t = useTranslations('invites');
  const ta = useTranslations('activities');
  const te = useTranslations();
  const router = useRouter();
  const [v, setV] = useState({
    title: '',
    description: '',
    activityType: 'traditional_strength',
    date: today,
    time: '08:00',
    durationMin: '60',
    visibility: 'FRIENDS' as 'PUBLIC' | 'FRIENDS' | 'DIRECT',
    maxPeople: '',
  });
  const [place, setPlace] = useState<Place | null>(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Place[] | null>(null);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [pending, start] = useTransition();
  const typeOptions = useMemo(
    () => ACTIVITY_GROUPS.map((g) => ({ group: ta(`groups.${g}`), keys: ACTIVITY_KEYS.filter((k) => activityGroup(k) === g) })),
    [ta],
  );

  const search = () =>
    startSearch(async () => {
      setError(null);
      const res = await searchPlaces(q);
      if (!res.ok) return setError(te(res.error));
      setFound(res.data);
    });

  const save = () =>
    start(async () => {
      if (!place) return setError(t('errors.place'));
      const res = await createInvite({
        title: v.title,
        description: v.description || null,
        activityType: v.activityType,
        date: v.date,
        time: v.time,
        durationMin: v.durationMin ? Number(v.durationMin) : null,
        place,
        visibility: v.visibility,
        maxPeople: v.maxPeople ? Number(v.maxPeople) : null,
        invitees,
      });
      if (!res.ok) return setError(te(res.error));
      router.push(`/invites/${res.data.id}`);
    });

  return (
    <div className="mg-activity-form">
      <label className="mg-activity-form__field">
        {t('form.title')}
        <TextInput value={v.title} maxLength={60} placeholder={t('form.titlePlaceholder')} onChange={(e) => setV({ ...v, title: e.target.value })} />
      </label>
      <label className="mg-activity-form__field">
        {t('form.type')}
        <select className="mg-input" value={v.activityType} onChange={(e) => setV({ ...v, activityType: e.target.value })}>
          {typeOptions.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.keys.map((k) => (
                <option key={k} value={k}>
                  {ta(`types.${k}`)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="mg-activity-form__grid">
        <label className="mg-activity-form__field">
          {t('form.date')}
          <input className="mg-input" type="date" min={today} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
        </label>
        <label className="mg-activity-form__field">
          {t('form.time')}
          <input className="mg-input" type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} />
        </label>
        <label className="mg-activity-form__field">
          {t('form.duration')}
          <input className="mg-input" type="number" inputMode="numeric" min={10} max={600} value={v.durationMin} onChange={(e) => setV({ ...v, durationMin: e.target.value })} />
        </label>
        <label className="mg-activity-form__field">
          {t('form.maxPeople')}
          <input className="mg-input" type="number" inputMode="numeric" min={2} max={100} placeholder="—" value={v.maxPeople} onChange={(e) => setV({ ...v, maxPeople: e.target.value })} />
        </label>
      </div>

      <fieldset className="mg-activity-form__effort">
        <legend>{t('form.place')}</legend>
        {place ? (
          <>
            <p className="mg-invite-place">{place.name}</p>
            <InviteMap pins={[{ id: 'p', lat: place.lat, lng: place.lng, label: place.name }]} height={180} />
            <Button variant="subtle" onClick={() => setPlace(null)}>
              {t('form.changePlace')}
            </Button>
          </>
        ) : (
          <>
            <div className="mg-invite-search">
              <TextInput
                value={q}
                placeholder={t('form.placePlaceholder')}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    search();
                  }
                }}
              />
              <Button variant="ghost" loading={searching} disabled={q.trim().length < 3} onClick={search}>
                {t('form.search')}
              </Button>
            </div>
            <p className="mg-social-join__hint">{t('form.placeHint')}</p>
            {found && (found.length ? (
              <ul className="mg-program-list">
                {found.map((p) => (
                  <li key={`${p.lat},${p.lng},${p.name}`}>
                    <button type="button" className="mg-program-row mg-activity-picker__row" onClick={() => setPlace(p)}>
                      <span className="mg-program-row__name">{p.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mg-notes__empty">{t('form.noPlaces')}</p>
            ))}
          </>
        )}
      </fieldset>

      <SegmentedControl
        name="visibility"
        legend={t('form.who')}
        value={v.visibility}
        onChange={(x) => setV({ ...v, visibility: x as typeof v.visibility })}
        options={[
          { value: 'FRIENDS', label: t('visibility.FRIENDS') },
          { value: 'PUBLIC', label: t('visibility.PUBLIC') },
          { value: 'DIRECT', label: t('visibility.DIRECT') },
        ]}
      />
      {friends.length > 0 && (
        <fieldset className="mg-activity-form__effort">
          <legend>{t('form.inviteFriends')}</legend>
          {friends.map((f) => (
            <label key={f.userId} className="mg-checkbox">
              <input
                type="checkbox"
                checked={invitees.includes(f.userId)}
                onChange={(e) => setInvitees(e.target.checked ? [...invitees, f.userId] : invitees.filter((x) => x !== f.userId))}
              />
              <span>
                {f.displayName} <small>@{f.handle}</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <label className="mg-activity-form__field">
        {t('form.description')}
        <textarea className="mg-input mg-notes__input" rows={3} maxLength={500} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </label>
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <Button block loading={pending} disabled={v.title.trim().length < 2 || !place || (v.visibility === 'DIRECT' && !invitees.length)} onClick={save}>
        {t('form.create')}
      </Button>
    </div>
  );
}
