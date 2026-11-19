import { useTranslations } from 'next-intl';
import type { BadgeState } from '@/lib/gamification/badges';
import Image from 'next/image';
import { badgeArt } from '@/lib/gamification/art';

/** Emblemas: ganhos com a data; os que faltam em cinzento, com a barra de progresso. */
export function BadgeGrid({ badges, formatDate }: { badges: BadgeState[]; formatDate: (d: string) => string }) {
  const t = useTranslations('game.badges');
  return (
    <ul className="mg-badges">
      {badges.map((b) => {
        return (
          <li key={b.id} title={b.earnedOn ? undefined : t(`${b.id}.how`)} className={b.earnedOn ? 'mg-badges__item mg-badges__item--earned' : 'mg-badges__item'}>
            <Image className="mg-badges__art" src={badgeArt(b.id)} alt="" width={72} height={72} />
            <span className="mg-badges__name">{t(`${b.id}.name`)}</span>
            {b.earnedOn && <span className="mg-badges__meta">{formatDate(b.earnedOn)}</span>}
            {!b.earnedOn && (
              <span className="mg-badges__bar" aria-hidden="true">
                <span className="mg-badges__fill" style={{ width: `${Math.round(b.progress * 100)}%` }} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
