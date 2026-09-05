import { useState } from 'react';
import type { Product } from '@/types';
import type { FitProfile, FitRecommendation } from '../types/fitTypes';
import ConfidenceChip from './ConfidenceChip';
import FitReceiptPanel from './FitReceiptPanel';
import FitNotes from './FitNotes';
import SizeComparison from './SizeComparison';
import FitAcrossProducts from './FitAcrossProducts';
import QuickAdjust from './QuickAdjust';
import { ChevronDown } from '@/components/Icons';
import '../styles/nykaa-fit.css';

interface Props {
  recommendation: FitRecommendation;
  product: Product;
  profile: FitProfile;
  selectable: boolean;
  onSelect: (size: string) => void;
  onEditProfile: () => void;
  onNavigateAway: () => void;
  onOpenSizeChart: () => void;
}

/**
 * The recommendation, in the order a shopper actually asks about it: what
 * size, how sure are you, why, and what would change it.
 *
 * The adjust controls sit above the explanation deliberately — changing
 * your preferred fit and watching the size move is a faster route to
 * trusting the answer than any amount of prose about how it was derived.
 */
export default function FitResult({
  recommendation,
  product,
  profile,
  selectable,
  onSelect,
  onEditProfile,
  onNavigateAway,
  onOpenSizeChart,
}: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const { recommendedSize, sizingHint, summary, substitution, confidence, notes } = recommendation;
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
            Every size stays selectable. Withholding is deliberate: a wrong size costs you a
            return, and on this combination we do not know enough to be useful.
          </p>
        </>
      ) : (
        <>
          <p className="fit-result__eyebrow">Your size in this style</p>

          <div className="fit-result__hero">
            <span className="fit-result__size">{recommendedSize}</span>
            <p className="fit-result__basis">
              From your measurements and {product.brand}&rsquo;s published chart
            </p>
          </div>

          <ConfidenceChip confidence={confidence} variant="full" />

          {sizingHint && <p className="fit-result__hint">{sizingHint}</p>}

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

      {/* ---- Change the inputs, watch the answer move ---- */}
      <QuickAdjust profile={profile} onEditFull={onEditProfile} />

      <FitNotes notes={notes} />

      {/* ---- The receipt ---- */}
      <section className={`fit-why ${showWhy ? 'is-open' : ''}`}>
        <button
          type="button"
          className="fit-why__head"
          aria-expanded={showWhy}
          onClick={() => setShowWhy((s) => !s)}
        >
          <span>{withheld ? 'What we know and what we are missing' : 'Exactly what we used'}</span>
          <ChevronDown size={18} className="fit-why__chev" />
        </button>
        {showWhy && (
          <div className="fit-why__body">
            <FitReceiptPanel recommendation={recommendation} brand={product.brand} />
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
    </div>
  );
}
