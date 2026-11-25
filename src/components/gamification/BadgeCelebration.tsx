'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { markBadgesSeen } from '@/actions/fitness';
import { badgeArt } from '@/lib/gamification/art';
import type { BadgeId } from '@/lib/gamification/badges';
import { Button } from '@/components/ui/Button';

const CONFETTI = 28;

/**
 * Pop-up de emblema novo: a arte em grande, o nome, como se ganhou e confetes (sem animação com movimento reduzido).
 * Vários emblemas de uma vez: um de cada vez («Seguinte»). Fechar marca-os como celebrados; "Partilhar" abre a
 * publicação com o emblema. Nunca a meio de um treino.
 */
export function BadgeCelebration({ badges }: { badges: { id: BadgeId; earnedOn: string }[] }) {
  const t = useTranslations('game');
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const cur = badges[i];

  useEffect(() => {
    if (pathname === '/session' || done) return;
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, [pathname, done]);

  const finish = () => {
    setDone(true);
    ref.current?.close();
    void markBadgesSeen(badges.map((b) => b.id)).catch(() => undefined);
  };
  if (!cur) return null;
  const last = i === badges.length - 1;

  return (
    <dialog ref={ref} className="mg-celebrate" onCancel={finish} aria-labelledby="celebrate-title">
      <div className="mg-celebrate__confetti" aria-hidden="true">
        {Array.from({ length: CONFETTI }, (_, k) => (
          <span key={`${i}-${k}`} className={`mg-celebrate__bit mg-celebrate__bit--${k % 4}`} style={{ left: `${(k * 37) % 100}%`, animationDelay: `${(k % 7) * 0.08}s` }} />
        ))}
      </div>
      <p className="mg-celebrate__kicker">{t('celebrate.kicker')}</p>
      <Image key={cur.id} className="mg-celebrate__art" src={badgeArt(cur.id)} alt="" width={180} height={180} />
      <h2 id="celebrate-title" className="mg-celebrate__title">
        {t(`badges.${cur.id}.name`)}
      </h2>
      <p className="mg-celebrate__text">{t(`badges.${cur.id}.how`)}</p>
      <p className="mg-celebrate__text">{t('celebrate.text')}</p>
      <div className="mg-celebrate__actions">
        <Link href={`/feed/new?share=badge:${cur.id}`} className="mg-btn mg-btn--primary" onClick={finish}>
          {t('celebrate.share')}
        </Link>
        <Button variant="ghost" onClick={() => (last ? finish() : setI(i + 1))}>
          {last ? t('celebrate.close') : t('celebrate.next', { n: badges.length - i - 1 })}
        </Button>
      </div>
    </dialog>
  );
}
