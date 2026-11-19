'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createGroup, deleteGroup, updateGroup } from '@/actions/groups';
import { GOAL_KINDS, GOAL_LIMITS, type GoalKind } from '@/lib/social/groups';
import { Button } from '@/components/ui/Button';
import { CheckChip } from '@/components/ui/CheckChip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextInput } from '@/components/ui/TextInput';

export interface GroupFormValue {
  name: string;
  description: string;
  isPublic: boolean;
  goalKind: GoalKind;
  goalTarget: number;
}

/** Criar ou editar um grupo: nome, descrição, público ou só por link, e a meta semanal por pessoa. */
export function GroupForm({ groupId, initial }: { groupId?: string; initial: GroupFormValue }) {
  const t = useTranslations('groups');
  const te = useTranslations();
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const lim = GOAL_LIMITS[v.goalKind];
  const save = () =>
    start(async () => {
      const input = { ...v, description: v.description || null };
      if (groupId) {
        const res = await updateGroup(groupId, input);
        if (!res.ok) return setError(te(res.error));
        router.push(`/groups/${groupId}`);
      } else {
        const res = await createGroup(input);
        if (!res.ok) return setError(te(res.error));
        router.push(`/groups/${res.data.id}`);
      }
      router.refresh();
    });
  return (
    <div className="mg-activity-form">
      <label className="mg-activity-form__field">
        {t('form.name')}
        <TextInput value={v.name} maxLength={40} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </label>
      <label className="mg-activity-form__field">
        {t('form.description')}
        <textarea className="mg-input mg-notes__input" rows={2} maxLength={200} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </label>
      <CheckChip icon="star" label={t('form.public')} checked={v.isPublic} onCheckedChange={(on) => setV({ ...v, isPublic: on })} />
      <p className="mg-social-join__hint">{v.isPublic ? t('form.publicHint') : t('form.privateHint')}</p>
      <SegmentedControl
        name="goalKind"
        legend={t('form.goal')}
        value={v.goalKind}
        onChange={(k) => setV({ ...v, goalKind: k as GoalKind, goalTarget: GOAL_LIMITS[k as GoalKind].default })}
        options={GOAL_KINDS.map((k) => ({ value: k, label: t(`goal.${k}`) }))}
      />
      <label className="mg-activity-form__field">
        {t('form.target', { kind: t(`goal.${v.goalKind}`) })}
        <input
          className="mg-input"
          type="number"
          inputMode="numeric"
          min={lim.min}
          max={lim.max}
          value={v.goalTarget}
          onChange={(e) => setV({ ...v, goalTarget: Math.max(0, Math.min(lim.max, Number(e.target.value) || 0)) })}
        />
      </label>
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <Button block loading={pending} disabled={v.name.trim().length < 2 || v.goalTarget < lim.min} onClick={save}>
        {groupId ? te('common.save') : t('form.create')}
      </Button>
      {groupId && (
        <Button
          variant="danger"
          block
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (!window.confirm(t('form.deleteConfirm'))) return;
              await deleteGroup(groupId);
              router.push('/groups');
              router.refresh();
            })
          }
        >
          {t('form.delete')}
        </Button>
      )}
    </div>
  );
}
