import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HERO_SLIDES } from '@/data/homeContent';
import GarmentArt from './GarmentArt';
import { ChevronLeft, ChevronRight } from './Icons';
import '@/styles/home.css';

const SLIDE_ART: { kind: Parameters<typeof GarmentArt>[0]['kind']; hex: string }[] = [
  { kind: 'dresses', hex: '#6d203a' },
  { kind: 'jeans', hex: '#2b3f5c' },
  { kind: 'shirts', hex: '#274b33' },
];

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = HERO_SLIDES[index];

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), 6000);
    return () => window.clearInterval(t);
  }, [paused]);

  const move = (dir: 1 | -1) =>
    setIndex((i) => (i + dir + HERO_SLIDES.length) % HERO_SLIDES.length);

  return (
    <section
      className="hero"
      style={{ background: `linear-gradient(135deg, ${slide.from}, ${slide.to2})` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      <div className="page hero__inner">
        <div className="hero__copy" key={slide.id}>
          <p className="eyebrow hero__eyebrow">{slide.eyebrow}</p>
          <h1 className="display hero__title">{slide.title}</h1>
          <p className="hero__sub">{slide.subtitle}</p>
          <Link to={slide.to} className="btn btn--primary hero__cta">
            {slide.cta}
          </Link>
        </div>

        <div className="hero__art" aria-hidden>
          {SLIDE_ART.map((art, i) => (
            <GarmentArt
              key={art.kind}
              kind={art.kind}
              hex={art.hex}
              view="styled"
              fit="contain"
              bare
              className={`hero__art-img ${i === index ? 'is-active' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="page hero__controls">
        <button type="button" className="hero__arrow" aria-label="Previous slide" onClick={() => move(-1)}>
          <ChevronLeft />
        </button>
        <div className="hero__dots" role="tablist" aria-label="Choose slide">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={s.eyebrow}
              className={`hero__dot ${i === index ? 'is-active' : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button type="button" className="hero__arrow" aria-label="Next slide" onClick={() => move(1)}>
          <ChevronRight />
        </button>
      </div>
    </section>
  );
}
