'use client';

import { Children, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/** Carrossel de um post (deslizar para o lado): a foto na capa, o slide editorial e as outras fotos; pontos em baixo. */
export function PostCarousel({ children }: { children: ReactNode }) {
  const t = useTranslations('social.editorial');
  const slides = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  return (
    <div className="mg-carousel" role="region" aria-roledescription="carousel" aria-label={t('carousel')}>
      <div
        ref={track}
        className="mg-carousel__track"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAt(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {slides.map((s, i) => (
          <div key={i} className="mg-carousel__slide" role="group" aria-roledescription="slide" aria-label={t('slide', { n: i + 1, total: slides.length })}>
            {s}
          </div>
        ))}
      </div>
      <div className="mg-carousel__dots" aria-hidden="true">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            className={i === at ? 'mg-carousel__dot mg-carousel__dot--on' : 'mg-carousel__dot'}
            onClick={() => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' })}
          />
        ))}
      </div>
    </div>
  );
}
