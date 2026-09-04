import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import type { FitProfile } from '../types/fitTypes';
import { PRODUCTS } from '@/data/products';
import { recommendForProduct } from '../engine/fitEngine';
import { isFitEligible } from '../utils/eligibility';
import '../styles/nykaa-fit.css';

interface Props {
  profile: FitProfile;
  currentProduct: Product;
  currentSize: string;
  onNavigate?: () => void;
}

const MAX_OTHERS = 3;

/**
 * The single strongest insight in the feature, shown rather than claimed:
 * the same profile produces different sizes on different garments, because
 * the cut and the brand's sizing behaviour differ.
 *
 * Products whose recommendation *differs* from the current one are preferred,
 * because a list that repeats the same letter demonstrates nothing.
 */
export default function FitAcrossProducts({
  profile,
  currentProduct,
  currentSize,
  onNavigate,
}: Props) {
  const others = useMemo(() => {
    const scored = PRODUCTS.filter(
      (p) => isFitEligible(p) && p.id !== currentProduct.id,
    ).map((p) => ({ product: p, size: recommendForProduct(profile, p)?.recommendedSize }));

    const withSize = scored.filter(
      (row): row is { product: Product; size: string } => Boolean(row.size),
    );

    const differing = withSize.filter((row) => row.size !== currentSize);
    const same = withSize.filter((row) => row.size === currentSize);

    return [...differing, ...same].slice(0, MAX_OTHERS);
  }, [profile, currentProduct.id, currentSize]);

  if (others.length === 0) return null;

  const varies = others.some((row) => row.size !== currentSize);

  return (
    <section className="fit-across" aria-labelledby="fit-across-title">
      <h3 id="fit-across-title" className="fit-across__title">
        {varies ? "Your size isn't universal" : 'Your size on other dresses'}
      </h3>
      <p className="fit-across__lede">
        {varies
          ? 'It depends on the garment. Same profile, different cuts and brand sizing:'
          : 'Same profile, applied to other dresses in this category:'}
      </p>

      <ul className="fit-across__list">
        <li className="fit-across__row is-current">
          <span className="fit-across__size">{currentSize}</span>
          <span className="fit-across__meta">
            <span className="fit-across__brand">{currentProduct.brand}</span>
            <span className="fit-across__name">This product</span>
          </span>
        </li>

        {others.map(({ product, size }) => (
          <li key={product.id} className="fit-across__row">
            <span className="fit-across__size">{size}</span>
            <Link to={`/p/${product.id}`} className="fit-across__meta" onClick={onNavigate}>
              <span className="fit-across__brand">{product.brand}</span>
              <span className="fit-across__name">{product.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
