import type { FitRecommendation } from '../types/fitTypes';
import ConfidenceChip from './ConfidenceChip';
import { RulerIcon } from '@/components/Icons';
import '../styles/nykaa-fit.css';

interface Props {
  recommendation: FitRecommendation;
  brand: string;
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
 * The inline PDP card for a shopper who already has a profile.
 *
 * Two states, and the second matters more: when the confidence model
 * declines to answer, this card does NOT name a size. It says so and hands
 * over to the brand's chart. A recommender that hedges while still printing
 * a letter has not withheld anything.
 */
export default function FitProfileSummary({
  recommendation,
  brand,
  applied,
  selectable,
  onSelect,
  onSeeWhy,
  onEditProfile,
  onOpenSizeChart,
}: Props) {
  const { recommendedSize, sizingHint, substitution, confidence, notes } = recommendation;

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
            What we&rsquo;re missing
          </button>
          <span aria-hidden>·</span>
          <button type="button" className="fit-link" onClick={onEditProfile}>
            Edit my measurements
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
        <ConfidenceChip confidence={confidence} />
      </div>

      <p className="fit-summary__eyebrow">Your size in this style</p>

      <div className="fit-summary__body">
        <span className="fit-summary__size">{recommendedSize}</span>
        <div className="fit-summary__copy">
          <p className="fit-summary__sub">
            From your measurements and {brand}&rsquo;s published chart
          </p>
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

      {notes.length > 0 && (
        <p className="fit-summary__notecount">
          {notes.length} thing{notes.length === 1 ? '' : 's'} to weigh before you buy —{' '}
          <button type="button" className="fit-link" onClick={onSeeWhy}>
            see {notes.length === 1 ? 'it' : 'them'}
          </button>
        </p>
      )}

      <div className="fit-summary__links">
        <button type="button" className="fit-link" onClick={onSeeWhy}>
          Why {recommendedSize}, and what we used
        </button>
        <span aria-hidden>·</span>
        <button type="button" className="fit-link" onClick={onEditProfile}>
          Edit my measurements
        </button>
      </div>
    </section>
  );
}
