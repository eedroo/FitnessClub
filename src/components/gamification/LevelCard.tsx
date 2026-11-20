import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { XpSummary } from '@/lib/gamification/xp';
import { levelArtHasNumber, levelFrame } from '@/lib/gamification/art';

/** Nível (selo com o número), barra de XP até ao próximo e a sequência de semanas. Em Treinos leva às conquistas. */
export function LevelCard({ summary, href }: { summary: XpSummary; href?: string }) {
  const t = useTranslations('game');
  const pct = Math.round((summary.into / summary.span) * 100);
  const body = (
    <>
      <span className="mg-level__seal" aria-hidden="true">
        <Image className="mg-level__frame" src={levelFrame(summary.level)} alt="" width={64} height={64} />
        {!levelArtHasNumber(summary.level) && <span className="mg-level__num">{summary.level}</span>}
      </span>
      <span className="mg-level__text">
        <span className="mg-level__title">{t('level', { n: summary.level })}</span>
        <span className="mg-level__bar" role="progressbar" aria-valuemin={0} aria-valuemax={summary.span} aria-valuenow={summary.into} aria-label={t('toNext')}>
          <span className="mg-level__fill" style={{ width: `${pct}%` }} />
        </span>
        <span className="mg-level__meta">
          {t('xpToNext', { into: summary.into, span: summary.span, next: summary.level + 1 })}
          {summary.weeks.current > 0 && ` · ${t('streak', { n: summary.weeks.current })}`}
        </span>
      </span>
    </>
  );
  return href ? (
    <Link href={href} className="mg-level mg-level--link">
      {body}
    </Link>
  ) : (
    <div className="mg-level">{body}</div>
  );
}
