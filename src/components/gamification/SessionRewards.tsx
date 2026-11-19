import { useTranslations } from 'next-intl';
import type { BadgeId } from '@/lib/gamification/badges';
import { MagicIcon } from '@/components/ui/MagicIcon';

/** No resumo da sessão: XP ganho, subida de nível e emblemas novos. */
export function SessionRewards({ xp, level, levelUp, badges }: { xp: number; level: number; levelUp: boolean; badges: BadgeId[] }) {
  const t = useTranslations('game');
  if (xp <= 0 && !badges.length) return null;
  return (
    <section className="mg-rewards" aria-label={t('rewards')}>
      <p className="mg-rewards__xp">
        <MagicIcon name="sparkles" size="sm" decorative /> {t('xpGained', { n: xp })}
        {levelUp && <span className="mg-rewards__up">{t('levelUp', { n: level })}</span>}
      </p>
      {badges.map((b) => (
        <p key={b} className="mg-rewards__badge">
          <MagicIcon name="trophy" size="sm" decorative /> {t('newBadge', { name: t(`badges.${b}.name`) })}
        </p>
      ))}
    </section>
  );
}
