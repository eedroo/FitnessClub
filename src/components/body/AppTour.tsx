'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { completeTour } from '@/actions/fitness';
import { Button } from '@/components/ui/Button';

/** Passos do tour: o que acender (`data-tour`) e o texto (`tour.steps.<key>`). Sem alvo: cartão ao centro. */
const STEPS: { key: string; target: string | null }[] = [
  { key: 'hello', target: null },
  { key: 'workouts', target: 'nav:/' },
  { key: 'ai', target: 'ai' },
  { key: 'feed', target: 'nav:/feed' },
  { key: 'sessions', target: 'nav:/sessions' },
  { key: 'day', target: 'nav:/day' },
  { key: 'me', target: 'nav:/corpo' },
  { key: 'settings', target: 'settings' },
];

const PAD = 6;

type Box = { top: number; left: number; width: number; height: number };

/**
 * Tour de boas-vindas do app, uma vez por conta (em Treinos, depois das boas-vindas): acende cada separador e o
 * programa feito pela IA, com uma explicação curta. "Saltar" ou o fim marcam-no como visto.
 */
export function AppTour() {
  const t = useTranslations('tour');
  const pathname = usePathname();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const cur = STEPS[step]!;

  useEffect(() => {
    if (pathname !== '/') return;
    setOpen(true);
  }, [pathname]);

  const measure = useCallback(() => {
    if (!cur.target) return setBox(null);
    const el = document.querySelector<HTMLElement>(`[data-tour="${cur.target}"]`);
    if (!el) return setBox(null);
    const r = el.getBoundingClientRect();
    setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [cur.target]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = cur.target ? document.querySelector<HTMLElement>(`[data-tour="${cur.target}"]`) : null;
    el?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    measure();
    card.current?.focus();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, cur.target, measure]);

  const finish = () => {
    setOpen(false);
    void completeTour().catch(() => undefined);
  };

  if (!open) return null;
  const last = step === STEPS.length - 1;
  // Cartão por cima do alvo quando ele está na metade de baixo do ecrã (a barra de separadores), senão por baixo.
  const below = box ? box.top + box.height / 2 < window.innerHeight / 2 : false;
  const cardPos = !box
    ? undefined
    : below
      ? { top: box.top + box.height + 12 }
      : { bottom: window.innerHeight - box.top + 12 };

  return (
    <div className="mg-tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" onKeyDown={(e) => e.key === 'Escape' && finish()}>
      {box ? (
        <span className="mg-tour__spot" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} aria-hidden="true" />
      ) : (
        <span className="mg-tour__scrim" aria-hidden="true" />
      )}
      <div ref={card} tabIndex={-1} className={`mg-tour__card${box ? '' : ' mg-tour__card--center'}${cur.key === 'ai' ? ' mg-tour__card--ai' : ''}`} style={cardPos}>
        <p className="mg-tour__count">{t('count', { n: step + 1, total: STEPS.length })}</p>
        <h2 id="tour-title" className="mg-tour__title">
          {t(`steps.${cur.key}.title`)}
        </h2>
        <p className="mg-tour__text">{t(`steps.${cur.key}.text`)}</p>
        <div className="mg-tour__actions">
          {!last && (
            <Button variant="ghost" onClick={finish}>
              {t('skip')}
            </Button>
          )}
          {step > 0 && (
            <Button variant="subtle" onClick={() => setStep(step - 1)}>
              {t('back')}
            </Button>
          )}
          <Button className="mg-btn--body" onClick={() => (last ? finish() : setStep(step + 1))}>
            {last ? t('done') : t('next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
