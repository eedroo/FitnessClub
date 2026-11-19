import { useTranslations } from 'next-intl';
import { BADGES, type BadgeState } from '@/lib/gamification/badges';
import type { MagicIconName } from '@/lib/icons';
import { MagicIcon } from '@/components/ui/MagicIcon';

const ICON: Record<(typeof BADGES)[number]['kind'], MagicIconName> = { sessions: 'dumbbell', prs: 'trophy', sets: 'star', streak: 'flame' };

/** Emblemas: ganhos com a data; os que faltam em cinzento, com a barra de progresso. */
export function BadgeGrid({ badges, formatDate }: { badges: BadgeState[]; formatDate: (d: string) => string }) {
  const t = useTranslations('game.badges');
  return (
    <ul className="mg-badges">
      {badges.map((b) => {
        const def = BADGES.find((x) => x.id === b.id)!;
        return (
          <li key={b.id} className={b.earnedOn ? 'mg-badges__item mg-badges__item--earned' : 'mg-badges__item'}>
            <span className="mg-badges__icon" aria-hidden="true">
              <MagicIcon name={ICON[def.kind]} size="md" decorative />
            </span>
            <span className="mg-badges__name">{t(`${b.id}.name`)}</span>
            <span className="mg-badges__meta">
              {b.earnedOn ? formatDate(b.earnedOn) : t(`${b.id}.how`)}
            </span>
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
