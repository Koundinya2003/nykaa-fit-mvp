import type { FitRecommendation } from '../types/fitTypes';
import FitMatch from './FitMatch';
import { RulerIcon } from '@/components/Icons';
import '../styles/nykaa-fit.css';

interface Props {
  recommendation: FitRecommendation;
  /** Whether the shopper has already picked the recommended size. */
  applied: boolean;
  selectable: boolean;
  onSelect: (size: string) => void;
  onSeeWhy: () => void;
  onEditProfile: () => void;
}

/**
 * Inline PDP card for a shopper who already has a profile — the
 * recommendation is computed from it, so there is nothing to fill in again.
 */
export default function FitProfileSummary({
  recommendation,
  applied,
  selectable,
  onSelect,
  onSeeWhy,
  onEditProfile,
}: Props) {
  const { recommendedSize, matchQuality, sizingHint, substitution } = recommendation;

  return (
    <section className="fit-summary" aria-label="Your Nykaa Fit recommendation">
      <div className="fit-summary__head">
        <span className="fit-summary__brand">
          <RulerIcon size={15} />
          Nykaa Fit
        </span>
        <FitMatch quality={matchQuality} variant="chip" />
      </div>

      <p className="fit-summary__eyebrow">Your recommended size</p>

      <div className="fit-summary__body">
        <span className="fit-summary__size">{recommendedSize}</span>
        <div className="fit-summary__copy">
          <p className="fit-summary__sub">Based on your profile and this product&rsquo;s fit</p>
          {sizingHint && <p className="fit-summary__hint">{sizingHint}</p>}
        </div>
        {!applied && selectable && (
          <button
            type="button"
            className="btn btn--primary btn--sm fit-summary__select"
            onClick={() => onSelect(recommendedSize)}
          >
            Select {recommendedSize}
          </button>
        )}
        {applied && <span className="fit-summary__applied">Selected</span>}
      </div>

      {substitution && (
        <p className="fit-summary__notice" role="status">
          {substitution.reason}
        </p>
      )}

      <div className="fit-summary__links">
        <button type="button" className="fit-link" onClick={onSeeWhy}>
          Why we recommend {recommendedSize}
        </button>
        <span aria-hidden>·</span>
        <button type="button" className="fit-link" onClick={onEditProfile}>
          Edit profile
        </button>
      </div>
    </section>
  );
}
