import type { FitProfile, PreferredFit } from '../types/fitTypes';
import { MEASUREMENT_KEYS, MEASUREMENT_LABEL } from '../types/fitTypes';
import { saveFitProfile } from '../utils/fitStorage';
import { track } from '../analytics/fitAnalytics';
import '../styles/nykaa-fit.css';

interface Props {
  profile: FitProfile;
  /** Opens the full editor, for changing the measurements themselves. */
  onEditFull: () => void;
}

const OPTIONS: { id: PreferredFit; label: string }[] = [
  { id: 'slim', label: 'Slim' },
  { id: 'regular', label: 'Regular' },
  { id: 'relaxed', label: 'Relaxed' },
];

/**
 * The fastest way to trust a recommendation is to change an input and watch
 * it respond.
 *
 * Preferred fit is the one input worth putting a control on directly: it is
 * a preference rather than a fact, shoppers genuinely change their mind
 * about it per garment, and it is the cheapest demonstration that the
 * number is computed rather than looked up. Saving is immediate — the
 * profile store notifies every subscriber, so the size above updates in
 * place without a submit step.
 */
export default function QuickAdjust({ profile, onEditFull }: Props) {
  const given = MEASUREMENT_KEYS.filter((k) => typeof profile.measurements[k] === 'number');

  const setPreference = (preferredFit: PreferredFit) => {
    if (preferredFit === profile.preferredFit) return;
    saveFitProfile({
      measurements: profile.measurements,
      preferredFit,
      heightCm: profile.heightCm,
    });
    track('fit_preference_changed', { reason: preferredFit });
  };

  return (
    <section className="adjust" aria-label="Adjust your fit">
      <p className="adjust__head">Change how you like it to fit</p>

      <div className="adjust__row" role="radiogroup" aria-label="Preferred fit">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={profile.preferredFit === option.id}
            className={`adjust__opt ${profile.preferredFit === option.id ? 'is-active' : ''}`}
            onClick={() => setPreference(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="adjust__basis">
        Sized on your{' '}
        {given.length > 0
          ? given
              .map((k) => `${MEASUREMENT_LABEL[k].toLowerCase()} ${profile.measurements[k]}″`)
              .join(', ')
          : 'measurements'}
        .{' '}
        <button type="button" className="fit-link" onClick={onEditFull}>
          Edit measurements
        </button>
      </p>
    </section>
  );
}
