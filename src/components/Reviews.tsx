import { useState } from 'react';
import type { Product } from '@/types';
import { getFitSentiment, getRatingBreakdown, getReviews } from '@/data/reviews';
import { formatCount } from '@/utils/format';
import Rating from './Rating';
import { CheckIcon, StarIcon } from './Icons';
import '@/styles/pdp.css';

interface Props {
  product: Product;
}

export default function Reviews({ product }: Props) {
  const reviews = getReviews(product.id);
  const breakdown = getRatingBreakdown(product);
  const fitSentiment = getFitSentiment(product.id);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? reviews : reviews.slice(0, 3);
  const maxBucket = Math.max(...breakdown, 1);

  return (
    <section className="reviews" id="reviews">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Ratings &amp; Reviews</h2>
          <p className="section-head__sub">
            {formatCount(product.reviewCount)} verified ratings for this product
          </p>
        </div>
      </div>

      <div className="reviews__layout">
        <aside className="reviews__summary">
          <p className="reviews__score">
            {product.rating.toFixed(1)}
            <StarIcon size={22} />
          </p>
          <p className="reviews__score-sub">{formatCount(product.reviewCount)} ratings</p>

          <ul className="reviews__bars">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = breakdown[star - 1];
              return (
                <li key={star}>
                  <span className="reviews__bar-star">
                    {star}
                    <StarIcon size={11} />
                  </span>
                  <span className="reviews__bar-track">
                    <span
                      className="reviews__bar-fill"
                      style={{ width: `${(n / maxBucket) * 100}%` }}
                    />
                  </span>
                  <span className="reviews__bar-n">{formatCount(n)}</span>
                </li>
              );
            })}
          </ul>

          {fitSentiment.length > 0 && (
            <div className="reviews__fit">
              <p className="eyebrow">How it fits</p>
              {fitSentiment.map((f) => (
                <div key={f.label} className="reviews__fit-row">
                  <span>{f.label}</span>
                  <span className="reviews__fit-track">
                    <span className="reviews__fit-fill" style={{ width: `${f.share}%` }} />
                  </span>
                  <span className="reviews__fit-pct">{f.share}%</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        <div className="reviews__list">
          {visible.map((r) => (
            <article key={r.id} className="review">
              <header className="review__head">
                <Rating value={r.rating} variant="chip" />
                <h3 className="review__title">{r.title}</h3>
              </header>
              <p className="review__body">{r.body}</p>
              <footer className="review__foot">
                <span className="review__author">{r.author}</span>
                {r.verified && (
                  <span className="review__verified">
                    <CheckIcon size={13} /> Verified purchase
                  </span>
                )}
                <span className="review__meta">
                  Size {r.sizeBought} · {r.fitFeedback}
                </span>
                <time dateTime={r.date}>
                  {new Date(r.date).toLocaleDateString('en-IN', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              </footer>
            </article>
          ))}

          {reviews.length > 3 && (
            <button
              type="button"
              className="btn btn--ghost btn--sm reviews__more"
              onClick={() => setShowAll((s) => !s)}
            >
              {showAll ? 'Show fewer reviews' : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
