import { useTranslations } from 'next-intl';
import type { BadgeId } from '@/lib/gamification/badges';
import Image from 'next/image';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { badgeArt } from '@/lib/gamification/art';

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
          <Image src={badgeArt(b)} alt="" width={40} height={40} /> {t('newBadge', { name: t(`badges.${b}.name`) })}
        </p>
      ))}
    </section>
  );
}
