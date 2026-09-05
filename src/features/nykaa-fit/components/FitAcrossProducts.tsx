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
  /** Null when the confidence model withheld a size for the current product. */
  currentSize: string | null;
  onNavigate?: () => void;
}

const MAX_OTHERS = 4;

/**
 * The strongest thing this feature can show, and it needs no invented data
 * to show it: the same measurements, run against different brands'
 * published charts, produce different letters.
 *
 * Every row is computed from the same profile and that brand's own chart —
 * the difference is the charts, which is precisely the problem the feature
 * exists to solve. Each row states the chart row it matched, so the claim
 * is checkable rather than asserted.
 */
export default function FitAcrossProducts({
  profile,
  currentProduct,
  currentSize,
  onNavigate,
}: Props) {
  const rows = useMemo(() => {
    const scored = PRODUCTS.filter((p) => isFitEligible(p) && p.id !== currentProduct.id).map(
      (p) => {
        const rec = recommendForProduct(profile, p);
        return {
          product: p,
          size: rec && !rec.confidence.withheld ? rec.recommendedSize : null,
          chart: rec && !rec.confidence.withheld ? p.sizeChart?.[rec.recommendedSize] : undefined,
        };
      },
    );

    const withSize = scored.filter(
      (row): row is { product: Product; size: string; chart: typeof row.chart } =>
        row.size !== null,
    );

    // A list that repeats the same letter demonstrates nothing, so sizes
    // that differ from the current one are shown first.
    const differing = withSize.filter((row) => row.size !== currentSize);
    const same = withSize.filter((row) => row.size === currentSize);
    return [...differing, ...same].slice(0, MAX_OTHERS);
  }, [profile, currentProduct.id, currentSize]);

  if (rows.length === 0) return null;

  const varies = rows.some((row) => row.size !== currentSize);
  const currentChart = currentSize ? currentProduct.sizeChart?.[currentSize] : undefined;

  return (
    <section className="fit-across" aria-labelledby="fit-across-title">
      <h3 id="fit-across-title" className="fit-across__title">
        {varies ? "Your size isn't universal" : 'Your size on other dresses'}
      </h3>
      <p className="fit-across__lede">
        {varies
          ? 'The same measurements, run against each brand’s own published chart. The letter changes because the charts do.'
          : 'The same measurements, run against other brands’ published charts:'}
      </p>

      <ul className="fit-across__list">
        {currentSize && (
          <li className="fit-across__row is-current">
            <span className="fit-across__size">{currentSize}</span>
            <span className="fit-across__meta">
              <span className="fit-across__brand">{currentProduct.brand}</span>
              <span className="fit-across__name">This product</span>
            </span>
            {currentChart && <ChartCell bust={currentChart.bust} waist={currentChart.waist} />}
          </li>
        )}

        {rows.map(({ product, size, chart }) => (
          <li key={product.id} className="fit-across__row">
            <span className="fit-across__size">{size}</span>
            <Link to={`/p/${product.id}`} className="fit-across__meta" onClick={onNavigate}>
              <span className="fit-across__brand">{product.brand}</span>
              <span className="fit-across__name">{product.name}</span>
            </Link>
            {chart && <ChartCell bust={chart.bust} waist={chart.waist} />}
          </li>
        ))}
      </ul>

      <p className="fit-across__note">
        Each row shows the body that brand cuts that size for. Nothing here comes from other
        shoppers — only your measurements and the brands&rsquo; own charts.
      </p>
    </section>
  );
}

/** The chart row behind a letter, so the comparison is checkable. */
function ChartCell({ bust, waist }: { bust: number; waist: number }) {
  return (
    <span className="fit-across__evidence">
      <span className="fit-across__evidence-label">
        cut for {bust}″ bust
      </span>
      <span className="fit-across__evidence-sub">{waist}″ waist</span>
    </span>
  );
}
