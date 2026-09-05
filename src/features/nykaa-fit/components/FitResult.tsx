import { useState } from 'react';
import type { Product } from '@/types';
import type { FitProfile, FitRecommendation } from '../types/fitTypes';
import FitMatch from './FitMatch';
import ConfidenceChip from './ConfidenceChip';
import SizeComparison from './SizeComparison';
import FitAcrossProducts from './FitAcrossProducts';
import HowThisWorks from './HowThisWorks';
import { ChevronDown } from '@/components/Icons';
import '../styles/nykaa-fit.css';

interface Props {
  recommendation: FitRecommendation;
  product: Product;
  profile: FitProfile;
  /** Whether the recommended size can actually be added to the bag. */
  selectable: boolean;
  /** True when this came from a previously saved profile. */
  fromSavedProfile: boolean;
  onSelect: (size: string) => void;
  onEditProfile: () => void;
  onNavigateAway: () => void;
  /** Opens the brand's published size chart — the fallback when we withhold. */
  onOpenSizeChart: () => void;
}

export default function FitResult({
  recommendation,
  product,
  profile,
  selectable,
  fromSavedProfile,
  onSelect,
  onEditProfile,
  onNavigateAway,
  onOpenSizeChart,
}: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const {
    recommendedSize,
    matchQuality,
    sizingHint,
    summary,
    explanation,
    substitution,
    confidence,
  } = recommendation;

  const withheld = confidence.withheld;

  return (
    <div className="fit-result">
      {withheld ? (
        <>
          <p className="fit-result__eyebrow">No size recommendation</p>
          <div className="fit-result__hero fit-result__hero--withheld">
            <span className="fit-result__size fit-result__size--withheld" aria-hidden>
              ?
            </span>
            <p className="fit-result__basis">
              We are not confident enough to name a size on this product.
            </p>
          </div>

          <ConfidenceChip confidence={confidence} variant="full" />

          <p className="fit-result__summary">{summary}</p>

          <button
            type="button"
            className="btn btn--accent btn--block fit-result__cta"
            onClick={onOpenSizeChart}
          >
            Open {product.brand}&rsquo;s size chart
          </button>

          <p className="fit-result__manual">
            Every size stays selectable. Withholding a recommendation is deliberate: a wrong size
            costs you a return, and on this combination we do not know enough to be useful.
          </p>
        </>
      ) : (
        <>
          <p className="fit-result__eyebrow">Your recommended size</p>

          <div className="fit-result__hero">
            <span className="fit-result__size">{recommendedSize}</span>
            <p className="fit-result__basis">
              Based on your profile and this product&rsquo;s fit
            </p>
            {fromSavedProfile && (
              <p className="fit-result__source">Using your saved fit profile</p>
            )}
          </div>

          <FitMatch quality={matchQuality} hint={sizingHint} />
          <ConfidenceChip confidence={confidence} variant="full" />

          {substitution && (
            <p className="fit-result__notice" role="status">
              {substitution.reason}
            </p>
          )}

          <p className="fit-result__summary">{summary}</p>

          <button
            type="button"
            className="btn btn--accent btn--block fit-result__cta"
            onClick={() => onSelect(recommendedSize)}
            disabled={!selectable}
          >
            {selectable ? `Select ${recommendedSize}` : `${recommendedSize} is out of stock`}
          </button>

          <p className="fit-result__manual">
            You can still pick any other size — this is a suggestion, not a restriction.
          </p>
        </>
      )}

      {/* ---- Why we recommend ---- */}
      <section className={`fit-why ${showWhy ? 'is-open' : ''}`}>
        <button
          type="button"
          className="fit-why__head"
          aria-expanded={showWhy}
          onClick={() => setShowWhy((s) => !s)}
        >
          <span>{withheld ? 'What we do and do not know' : `Why we recommend ${recommendedSize}`}</span>
          <ChevronDown size={18} className="fit-why__chev" />
        </button>

        {showWhy && (
          <div className="fit-why__body">
            <div className="fit-why__cols">
              <div className="fit-why__col">
                <p className="fit-why__label">Your profile</p>
                <dl className="fit-why__rows">
                  {explanation.profile.map((row) => (
                    <div key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="fit-why__col">
                <p className="fit-why__label">This product</p>
                <dl className="fit-why__rows">
                  {explanation.product.map((row) => (
                    <div key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {explanation.adjustments.length > 0 && (
              <div className="fit-why__adjust">
                <p className="fit-why__label">What moved the recommendation</p>
                <ul>
                  {explanation.adjustments.map((a) => (
                    <li key={a.label}>
                      <span className="fit-why__factor">
                        {a.label}: <strong>{a.value}</strong>
                      </span>
                      <span className={`fit-why__dir is-${a.direction}`}>
                        {a.direction === 'up'
                          ? '→ pushes recommendation up'
                          : '→ pushes recommendation down'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="fit-why__conclusion">
              <p className="fit-why__label">Size comparison</p>
              <p>{explanation.comparison}</p>
            </div>

            <HowThisWorks />
          </div>
        )}
      </section>

      {/* ---- Compare sizes ---- */}
      <section className={`fit-why ${showCompare ? 'is-open' : ''}`}>
        <button
          type="button"
          className="fit-why__head"
          aria-expanded={showCompare}
          onClick={() => setShowCompare((s) => !s)}
        >
          <span>Compare sizes</span>
          <ChevronDown size={18} className="fit-why__chev" />
        </button>
        {showCompare && (
          <div className="fit-why__body">
            <SizeComparison recommendation={recommendation} />
          </div>
        )}
      </section>

      <FitAcrossProducts
        profile={profile}
        currentProduct={product}
        currentSize={withheld ? null : recommendedSize}
        onNavigate={onNavigateAway}
      />

      <div className="fit-result__links">
        <button type="button" className="fit-link" onClick={onEditProfile}>
          Edit my fit profile
        </button>
      </div>
    </div>
  );
}
