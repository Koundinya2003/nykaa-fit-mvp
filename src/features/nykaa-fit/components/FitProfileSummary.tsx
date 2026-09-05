import type { FitRecommendation } from '../types/fitTypes';
import FitMatch from './FitMatch';
import ConfidenceChip from './ConfidenceChip';
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
  /** Opens the brand's published size chart — the fallback when we withhold. */
  onOpenSizeChart: () => void;
}

/**
 * Inline PDP card for a shopper who already has a profile.
 *
 * Two states, and the second one matters more than the first: when the
 * confidence model declines to answer, this card does NOT name a size. It
 * says so and hands over to the brand's size chart. A recommender that
 * hedges while still printing a letter has not withheld anything.
 */
export default function FitProfileSummary({
  recommendation,
  applied,
  selectable,
  onSelect,
  onSeeWhy,
  onEditProfile,
  onOpenSizeChart,
}: Props) {
  const { recommendedSize, matchQuality, sizingHint, substitution, confidence } = recommendation;

  if (confidence.withheld) {
    return (
      <section className="fit-summary fit-summary--withheld" aria-label="Nykaa Fit">
        <div className="fit-summary__head">
          <span className="fit-summary__brand">
            <RulerIcon size={15} />
            Nykaa Fit
          </span>
          <ConfidenceChip confidence={confidence} />
        </div>

        <p className="fit-summary__eyebrow">No size recommendation</p>
        <p className="fit-summary__withheld-lede">
          We&rsquo;d rather say nothing than guess. {confidence.limitingFactor}
        </p>

        <button
          type="button"
          className="btn btn--primary btn--sm fit-summary__chart"
          onClick={onOpenSizeChart}
        >
          Open the size chart instead
        </button>

        <div className="fit-summary__links">
          <button type="button" className="fit-link" onClick={onSeeWhy}>
            Why we can&rsquo;t recommend a size
          </button>
          <span aria-hidden>·</span>
          <button type="button" className="fit-link" onClick={onEditProfile}>
            Edit profile
          </button>
        </div>
      </section>
    );
  }

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

      <div className="fit-summary__confrow">
        <ConfidenceChip confidence={confidence} />
        {confidence.cappedByEstimate && (
          <button type="button" className="fit-link" onClick={onEditProfile}>
            Add measurements to raise this
          </button>
        )}
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
