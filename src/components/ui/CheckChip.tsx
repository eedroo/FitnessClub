'use client';

import type { MagicIconName } from '@/lib/icons';
import { MagicIcon } from './MagicIcon';

interface CheckChipProps {
  icon: MagicIconName;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Linha com interruptor ao estilo iOS (ícone, texto e switch à direita); por baixo é uma checkbox nativa com `role="switch"`. */
export function CheckChip({ icon, label, checked, onCheckedChange }: CheckChipProps) {
  return (
    <label className={checked ? 'mg-check-chip mg-check-chip--checked' : 'mg-check-chip'}>
      <input
        className="mg-check-chip__input"
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <span className="mg-check-chip__icon" aria-hidden="true">
        <MagicIcon name={icon} size="sm" decorative />
      </span>
      <span className="mg-check-chip__label">{label}</span>
      <span className="mg-check-chip__box" aria-hidden="true">
        <span className="mg-check-chip__thumb" />
      </span>
    </label>
  );
}
