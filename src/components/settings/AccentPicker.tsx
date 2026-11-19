'use client';

import { Check } from 'lucide-react';
import { ACCENTS, type Accent } from '@/lib/accent';

/**
 * Cor de destaque: bolinhas de cor em radiogroup (teclado ← → nativo dos radios). Cada bolinha usa os tokens da
 * própria cor (`data-accent` no elemento) e a escolha pré-visualiza-se logo em todo o app.
 */
export function AccentPicker({ value, onChange, legend, labels }: { value: Accent; onChange: (a: Accent) => void; legend: string; labels: Record<Accent, string> }) {
  return (
    <fieldset className="mg-accent-picker">
      <legend className="mg-segmented__legend">{legend}</legend>
      <div className="mg-accent-picker__row">
        {ACCENTS.map((a) => (
          <label key={a} className="mg-accent-picker__option" data-accent={a}>
            <input
              type="radio"
              name="accent"
              value={a}
              checked={value === a}
              className="mg-accent-picker__input"
              onChange={() => {
                document.documentElement.dataset.accent = a; // pré-visualização imediata
                onChange(a);
              }}
            />
            <span className="mg-accent-picker__dot" aria-hidden="true">
              {value === a && <Check size={16} strokeWidth={3} />}
            </span>
            <span className="mg-accent-picker__label">{labels[a]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
