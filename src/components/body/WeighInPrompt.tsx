'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { logWeight } from '@/actions/body';
import type { DateISO } from '@/lib/dates';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

const SKIP_KEY = 'mg-weighin-skip';

/**
 * Lembrete de pesagem (diário ou semanal): ao abrir a app, enquanto não houver peso neste período, uma folha pede o
 * peso de hoje e regista-o. "Agora não" deixa de perguntar até ao período seguinte (neste dispositivo). Nunca durante
 * um treino nem nas boas-vindas do app.
 */
export function WeighInPrompt({ period, today, weekly, lastKg }: { period: DateISO; today: DateISO; weekly: boolean; lastKg: string }) {
  const t = useTranslations('body.weighIn');
  const te = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const [kg, setKg] = useState(lastKg);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (pathname.startsWith('/session') || pathname.startsWith('/weight')) return;
    try {
      if (window.localStorage.getItem(SKIP_KEY) === period) return;
    } catch {
      // sem armazenamento: pergunta na mesma
    }
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // Só ao abrir a app (não a cada página).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => ref.current?.close();
  const skip = () => {
    try {
      window.localStorage.setItem(SKIP_KEY, period);
    } catch {
      // ignora
    }
    close();
  };
  const save = () =>
    start(async () => {
      const res = await logWeight({ date: today, kg });
      if (!res.ok) return setError(te(res.error));
      close();
      router.refresh();
    });

  return (
    <dialog ref={ref} className="mg-body-sheet mg-weight-entry" onCancel={skip} aria-labelledby="weigh-in-title">
      <h2 id="weigh-in-title" className="mg-body-sheet__title">
        {t(weekly ? 'titleWeekly' : 'title')}
      </h2>
      <div className="mg-body-sheet__form">
        <label>
          {t('kgLabel')}
          <TextInput
            className="mg-weight-entry__kg"
            inputMode="decimal"
            autoComplete="off"
            value={kg}
            placeholder="0,0"
            onChange={(e) => setKg(e.target.value.replace(/[^\d.,]/g, '').slice(0, 7))}
          />
        </label>
        {error && (
          <p className="mg-set-input__error" role="alert">
            {error}
          </p>
        )}
        <div className="mg-body-sheet__actions">
          <Button className="mg-btn--body" loading={pending} disabled={!kg.trim()} onClick={save}>
            {t('save')}
          </Button>
          <Button variant="ghost" onClick={skip}>
            {t('skip')}
          </Button>
        </div>
        <Link href="/settings" className="mg-weight-entry__settings" onClick={close}>
          {t('change')}
        </Link>
      </div>
    </dialog>
  );
}
