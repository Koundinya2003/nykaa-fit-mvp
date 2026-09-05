import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import type { FitProfile } from '../types/fitTypes';
import { PRODUCTS } from '@/data/products';
import { recommendForProduct } from '../engine/fitEngine';
import { brandFitHistory, type BrandFitHistory } from '../engine/brandFitHistory';
import { isFitEligible } from '../utils/eligibility';
import { useFitOutcomes } from '../utils/useFitOutcomes';
import '../styles/nykaa-fit.css';

interface Props {
  profile: FitProfile;
  currentProduct: Product;
  /** Null when the confidence model withheld a size for the current product. */
  currentSize: string | null;
  onNavigate?: () => void;
}

const MAX_OTHERS = 4;

/**
 * The single strongest insight in the feature, shown rather than claimed:
 * the same profile produces different sizes on different garments.
 *
 * Every row carries the reason — the brand's cut, and how that brand's
 * garments have actually been reported to run. Those numbers come out of
 * engine/brandFitHistory.ts, which aggregates review fit feedback and any
 * outcomes the shopper has reported. Nothing on this panel is a constant
 * somebody typed in, which is the point: the claim is falsifiable.
 */
export default function FitAcrossProducts({
  profile,
  currentProduct,
  currentSize,
  onNavigate,
}: Props) {
  // Re-runs when the shopper reports a kept/returned outcome, so the panel
  // visibly moves when the feedback loop fires.
  const outcomes = useFitOutcomes();

  const { rows, currentHistory } = useMemo(() => {
    const scored = PRODUCTS.filter((p) => isFitEligible(p) && p.id !== currentProduct.id).map(
      (p) => {
        const rec = recommendForProduct(profile, p);
        return {
          product: p,
          size: rec && !rec.confidence.withheld ? rec.recommendedSize : null,
          history: brandFitHistory(p.brand, p.brandSizing),
        };
      },
    );

    const withSize = scored.filter(
      (row): row is { product: Product; size: string; history: BrandFitHistory } =>
        row.size !== null,
    );

    // A list that repeats the same letter demonstrates nothing, so sizes
    // that differ from the current one are shown first.
    const differing = withSize.filter((row) => row.size !== currentSize);
    const same = withSize.filter((row) => row.size === currentSize);

    return {
      rows: [...differing, ...same].slice(0, MAX_OTHERS),
      currentHistory: brandFitHistory(currentProduct.brand, currentProduct.brandSizing),
    };
    // `outcomes` is a dependency because reported outcomes change the brand
    // histories the recommendations are computed from.
  }, [profile, currentProduct, currentSize, outcomes]);

  if (rows.length === 0) return null;

  const varies = rows.some((row) => row.size !== currentSize);

  return (
    <section className="fit-across" aria-labelledby="fit-across-title">
      <h3 id="fit-across-title" className="fit-across__title">
        {varies ? "Your size isn't universal" : 'Your size on other dresses'}
      </h3>
      <p className="fit-across__lede">
        {varies
          ? 'One profile, one set of measurements, different answers — because each brand cuts to its own block and its garments run the way its shoppers report.'
          : 'Same profile, applied to other dresses in this category:'}
      </p>

      <ul className="fit-across__list">
        {currentSize && (
          <li className="fit-across__row is-current">
            <span className="fit-across__size">{currentSize}</span>
            <span className="fit-across__meta">
              <span className="fit-across__brand">{currentProduct.brand}</span>
              <span className="fit-across__name">This product</span>
            </span>
            <BrandEvidence history={currentHistory} />
          </li>
        )}

        {rows.map(({ product, size, history }) => (
          <li key={product.id} className="fit-across__row">
            <span className="fit-across__size">{size}</span>
            <Link to={`/p/${product.id}`} className="fit-across__meta" onClick={onNavigate}>
              <span className="fit-across__brand">{product.brand}</span>
              <span className="fit-across__name">{product.name}</span>
            </Link>
            <BrandEvidence history={history} />
          </li>
        ))}
      </ul>

      <p className="fit-across__note">
        Each row&rsquo;s note is computed from that brand&rsquo;s fit feedback and any outcomes you
        have reported — not from a fixed label. Report a return and these move.
      </p>
    </section>
  );
}

/** The evidence behind one row, in the smallest space that still says what
 *  it is based on. */
function BrandEvidence({ history }: { history: BrandFitHistory }) {
  return (
    <span className="fit-across__evidence">
      <span className="fit-across__evidence-label">
        {history.label[0].toUpperCase() + history.label.slice(1)}
      </span>
      <span className="fit-across__evidence-sub">
        {history.reviewCount} fit reports
        {history.outcomeCount > 0 && ` · ${history.outcomeCount} of yours`}
        {history.shiftedByOutcomes && (
          <span className="fit-across__evidence-shift">
            {' '}
            {history.outcomeShift > 0 ? '↑' : '↓'}
            {Math.abs(history.outcomeShift).toFixed(2)}″
          </span>
        )}
      </span>
    </span>
  );
}
