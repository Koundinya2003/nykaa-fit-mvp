import type { ConfidenceBreakdown } from '../types/fitTypes';
import { CONFIDENCE_LABEL } from '../engine/confidence';
import '../styles/nykaa-fit.css';

interface Props {
  confidence: ConfidenceBreakdown;
  /** `chip` for lists and cards, `full` for the result panel. */
  variant?: 'chip' | 'full';
}

/**
 * How much to trust the size, stated as a level rather than a percentage.
 *
 * The number behind it is a ranking artefact with no validation data under
 * it; printing "83%" would claim a calibration this heuristic has not
 * earned. Three levels is what the evidence supports, and the third level
 * means we do not answer at all.
 */
export default function ConfidenceChip({ confidence, variant = 'chip' }: Props) {
  const label = CONFIDENCE_LABEL[confidence.level];

  // The limiting factor is what is HOLDING THE ANSWER BACK. At high
  // confidence nothing is, so showing it there reads as a contradiction —
  // a green chip next to a sentence explaining what is wrong.
  const caveat = confidence.level === 'high' ? null : confidence.limitingFactor;

  if (variant === 'chip') {
    return (
      <span className={`fit-conf fit-conf--${confidence.level}`} title={caveat ?? undefined}>
        {label}
      </span>
    );
  }

  return (
    <div className="fit-confrow">
      <span className={`fit-conf fit-conf--${confidence.level}`}>{label}</span>
      {caveat && <span className="fit-conf__why">{caveat}</span>}
    </div>
  );
}
