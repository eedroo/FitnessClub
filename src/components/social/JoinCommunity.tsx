'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { saveSocialProfile } from '@/actions/social';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

/** Entrar na comunidade (escolher o @, o nome e aceitar as regras) ou editar o perfil público. */
export function JoinCommunity({ initial, edit = false }: { initial: { handle: string; displayName: string; bio: string }; edit?: boolean }) {
  const t = useTranslations('social.join');
  const te = useTranslations();
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [rules, setRules] = useState(edit);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const res = await saveSocialProfile({ ...v, bio: v.bio || null, acceptRules: rules });
      if (!res.ok) return setError(te(res.error));
      router.push('/feed');
      router.refresh();
    });
  return (
    <div className="mg-social-join">
      {!edit && (
        <>
          <h2 className="mg-social-join__title">{t('title')}</h2>
          <p className="mg-social-join__text">{t('text')}</p>
        </>
      )}
      <label className="mg-activity-form__field">
        {t('handle')}
        <TextInput value={v.handle} maxLength={21} autoCapitalize="none" spellCheck={false} placeholder="ana.treina" onChange={(e) => setV({ ...v, handle: e.target.value })} />
        <span className="mg-social-join__hint">{t('handleHint')}</span>
      </label>
      <label className="mg-activity-form__field">
        {t('name')}
        <TextInput value={v.displayName} maxLength={40} onChange={(e) => setV({ ...v, displayName: e.target.value })} />
      </label>
      <label className="mg-activity-form__field">
        {t('bio')}
        <textarea className="mg-input mg-notes__input" rows={2} maxLength={160} value={v.bio} onChange={(e) => setV({ ...v, bio: e.target.value })} />
      </label>
      {!edit && (
        <label className="mg-checkbox mg-checkbox--top">
          <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} />
          <span>
            {t('rules')}{' '}
            <Link href="/terms#comunidade" target="_blank">
              {t('rulesLink')}
            </Link>
          </span>
        </label>
      )}
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <Button block loading={pending} disabled={!v.handle.trim() || !v.displayName.trim() || !rules} onClick={save}>
        {edit ? te('common.save') : t('join')}
      </Button>
    </div>
  );
}
