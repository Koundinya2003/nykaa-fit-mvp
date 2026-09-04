import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import ProductCard from './ProductCard';
import { ChevronLeft, ChevronRight } from './Icons';
import '@/styles/product.css';

interface Props {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllTo?: string;
}

/** Horizontal product rail. Scrolling is native (so it works with touch and
 *  trackpads); the arrows just nudge the scroll container by one page. */
export default function RecommendationCarousel({ title, subtitle, products, viewAllTo }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      el.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [sync, products]);

  /** Scroll by whole cards. Landing between snap points makes Chromium
   *  re-snap mid-animation and cancel it, so the step is measured from the
   *  gap between the first two items and the target is always a snap point. */
  const nudge = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const items = el.children;
    const first = items[0] as HTMLElement | undefined;
    const second = items[1] as HTMLElement | undefined;
    const step =
      first && second
        ? second.offsetLeft - first.offsetLeft
        : (first?.offsetWidth ?? el.clientWidth);
    // `round`, not `floor`: the last visible card's step includes a trailing
    // gap that is not actually rendered, so flooring pages one card short.
    const perPage = Math.max(1, Math.round(el.clientWidth / step));
    const target = Math.round((el.scrollLeft + dir * step * perPage) / step) * step;
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  };

  if (products.length === 0) return null;

  return (
    <section className="rail">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">{title}</h2>
          {subtitle && <p className="section-head__sub">{subtitle}</p>}
        </div>
        <div className="rail__controls">
          {viewAllTo && (
            <Link to={viewAllTo} className="section-head__link">
              View All
            </Link>
          )}
          <button
            type="button"
            className="rail__arrow"
            aria-label="Scroll left"
            onClick={() => nudge(-1)}
            disabled={atStart}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="rail__arrow"
            aria-label="Scroll right"
            onClick={() => nudge(1)}
            disabled={atEnd}
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      <div className="rail__track" ref={trackRef}>
        {products.map((p) => (
          <div key={p.id} className="rail__item">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
