import type { MatchQuality, SizingHint } from '../types/fitTypes';
import '../styles/nykaa-fit.css';

interface Props {
  quality: MatchQuality;
  hint?: SizingHint | null;
  /** `chip` for the compact PDP card, `full` for the result panel. */
  variant?: 'chip' | 'full';
}

const TONE: Record<MatchQuality, string> = {
  'Strong match': 'strong',
  'Good match': 'good',
  'Closest available size': 'nearest',
};

/**
 * How well the size matches, stated qualitatively.
 *
 * There is deliberately no percentage here. We have no validation data, so a
 * number would imply a probability of being right that this heuristic cannot
 * support — see `matchScore` in the engine, which stays internal.
 */
export default function FitMatch({ quality, hint, variant = 'full' }: Props) {
  if (variant === 'chip') {
    return <span className={`fit-match fit-match--${TONE[quality]}`}>{quality}</span>;
  }

  return (
    <div className="fit-matchrow">
      <span className={`fit-match fit-match--${TONE[quality]}`}>{quality}</span>
      {hint && <span className="fit-match__hint">{hint}</span>}
    </div>
  );
}
