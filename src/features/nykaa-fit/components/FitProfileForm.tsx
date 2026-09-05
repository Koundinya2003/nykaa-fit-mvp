import { useEffect, useMemo, useState } from 'react';
import type {
  FieldErrors,
  FitProfile,
  FitProfileDraft,
  MeasurementKey,
  PartialMeasurements,
  PreferredFit,
} from '../types/fitTypes';
import { MEASUREMENT_HOWTO, MEASUREMENT_KEYS, MEASUREMENT_LABEL } from '../types/fitTypes';
import { PREFERENCE_LABEL } from '../engine/scoring';
import { ShieldIcon } from '@/components/Icons';
import '../styles/nykaa-fit.css';

/* =========================================================================
   The fit profile form.

   Three numbers and a preference, all of them the shopper's own. Two design
   decisions carry most of the weight here:

   1. EVERY MEASUREMENT IS OPTIONAL, and the form says what each one buys.
      A shopper with a tape measure and thirty seconds gives one number; the
      feature should do something useful with it and be honest about the
      limits, rather than demanding all three or inventing the rest.

   2. NOTHING IS ESTIMATED. There is no height/weight path, because deriving
      a bust measurement from two unrelated numbers is guessing, and a guess
      presented as her body is worse than no answer. If she does not know
      her measurements, the honest output is the size chart and instructions
      for taking them.

   `onChange` fires on every valid edit so callers can show a live preview
   of what these numbers do, which is what makes the profile feel like hers
   rather than a form she submits into a black box.
   ========================================================================= */

interface Props {
  existing: FitProfile | null;
  onSubmit: (profile: Omit<FitProfile, 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
  /** Fires on every edit with the currently valid values, for live preview. */
  onChange?: (draft: Omit<FitProfile, 'createdAt' | 'updatedAt'>) => void;
  submitLabel?: string;
  /** Hides the cancel button when the form is a page rather than a dialog. */
  showCancel?: boolean;
}

const PREFERRED_FITS: { id: PreferredFit; label: string; hint: string }[] = [
  { id: 'slim', label: 'Slim', hint: 'Close to the body' },
  { id: 'regular', label: 'Regular', hint: 'True to size' },
  { id: 'relaxed', label: 'Relaxed', hint: 'Room to move' },
];

const LIMITS = { girth: { min: 24, max: 70 }, height: { min: 120, max: 220 } };

export function toDraft(profile: FitProfile | null): FitProfileDraft {
  return {
    bust: profile?.measurements.bust ? String(profile.measurements.bust) : '',
    waist: profile?.measurements.waist ? String(profile.measurements.waist) : '',
    hip: profile?.measurements.hip ? String(profile.measurements.hip) : '',
    heightCm: profile?.heightCm ? String(profile.heightCm) : '',
    preferredFit: profile?.preferredFit ?? 'regular',
  };
}

/** Only complains about values that are present and wrong. A blank field is
 *  a choice, not an error. */
export function validate(draft: FitProfileDraft): FieldErrors {
  const errors: FieldErrors = {};

  MEASUREMENT_KEYS.forEach((key) => {
    const raw = draft[key].trim();
    if (!raw) return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < LIMITS.girth.min || n > LIMITS.girth.max) {
      errors[key] = `Enter a value between ${LIMITS.girth.min} and ${LIMITS.girth.max} inches`;
    }
  });

  const h = draft.heightCm.trim();
  if (h) {
    const n = Number(h);
    if (!Number.isFinite(n) || n < LIMITS.height.min || n > LIMITS.height.max) {
      errors.heightCm = `Enter a height between ${LIMITS.height.min} and ${LIMITS.height.max} cm`;
    }
  }

  return errors;
}

export function draftToProfile(
  draft: FitProfileDraft,
): Omit<FitProfile, 'createdAt' | 'updatedAt'> {
  const measurements: PartialMeasurements = {};
  MEASUREMENT_KEYS.forEach((key) => {
    const raw = draft[key].trim();
    if (!raw) return;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= LIMITS.girth.min && n <= LIMITS.girth.max) {
      measurements[key] = n;
    }
  });

  const height = Number(draft.heightCm.trim());
  return {
    measurements,
    preferredFit: draft.preferredFit,
    heightCm:
      draft.heightCm.trim() &&
      Number.isFinite(height) &&
      height >= LIMITS.height.min &&
      height <= LIMITS.height.max
        ? height
        : undefined,
  };
}

export default function FitProfileForm({
  existing,
  onSubmit,
  onCancel,
  onChange,
  submitLabel,
  showCancel = true,
}: Props) {
  const [draft, setDraft] = useState<FitProfileDraft>(() => toDraft(existing));
  const [errors, setErrors] = useState<FieldErrors>({});

  const given = useMemo(
    () => MEASUREMENT_KEYS.filter((k) => draft[k].trim() !== '' && !errors[k]),
    [draft, errors],
  );

  // Live preview: callers see the answer move as she types.
  useEffect(() => {
    if (!onChange) return;
    if (Object.keys(validate(draft)).length > 0) return;
    onChange(draftToProfile(draft));
  }, [draft, onChange]);

  const set = <K extends keyof FitProfileDraft>(key: K, value: FitProfileDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(draft);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSubmit(draftToProfile(draft));
  };

  return (
    <form className="fit-form" onSubmit={submit} noValidate>
      <div className="fit-form__intro">
        <p className="fit-form__lede">
          Your measurements, in inches. A measurement means the same thing at every brand — a size
          label does not, which is exactly why you are an M at one label and an L at another.
        </p>
        <p className="fit-form__lede fit-form__lede--muted">
          Give whichever you know. We use only what you enter and never estimate the rest.
        </p>
      </div>

      <div className="fit-measure">
        {MEASUREMENT_KEYS.map((key) => (
          <label className="fit-field" key={key}>
            <span className="fit-field__label">
              {MEASUREMENT_LABEL[key]}
              <span className="fit-field__opt">optional</span>
            </span>
            <span className="fit-field__control">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="—"
                value={draft[key]}
                aria-invalid={Boolean(errors[key])}
                aria-describedby={`how-${key}`}
                onChange={(e) => set(key, e.target.value.replace(/[^\d.]/g, ''))}
              />
              <span className="fit-field__unit">in</span>
            </span>
            {errors[key] ? (
              <span className="fit-field__error" role="alert">
                {errors[key]}
              </span>
            ) : (
              <span className="fit-field__hint" id={`how-${key}`}>
                {MEASUREMENT_HOWTO[key]}
              </span>
            )}
          </label>
        ))}
      </div>

      <MeasurementCoverage given={given} />

      <fieldset className="fit-fieldset">
        <legend className="fit-field__label">How do you like clothes to fit?</legend>
        <div className="fit-choices fit-choices--stacked">
          {PREFERRED_FITS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`fit-choice fit-choice--rich ${draft.preferredFit === f.id ? 'is-active' : ''}`}
              aria-pressed={draft.preferredFit === f.id}
              onClick={() => set('preferredFit', f.id)}
            >
              <span className="fit-choice__label">{f.label}</span>
              <span className="fit-choice__hint">{f.hint}</span>
            </button>
          ))}
        </div>
        <p className="fit-field__hint">
          {PREFERENCE_LABEL[draft.preferredFit]} — this shifts how much room we look for, and you
          can change it any time.
        </p>
      </fieldset>

      <details className="fit-optional-extra">
        <summary>Add your height (optional)</summary>
        <div className="fit-optional__body">
          <label className="fit-field">
            <span className="fit-field__label">Height</span>
            <span className="fit-field__control">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="—"
                value={draft.heightCm}
                aria-invalid={Boolean(errors.heightCm)}
                onChange={(e) => set('heightCm', e.target.value.replace(/[^\d.]/g, ''))}
              />
              <span className="fit-field__unit">cm</span>
            </span>
            {errors.heightCm ? (
              <span className="fit-field__error" role="alert">
                {errors.heightCm}
              </span>
            ) : (
              <span className="fit-field__hint">
                Kept for context on length. It is never used to estimate a measurement you did not
                give.
              </span>
            )}
          </label>
        </div>
      </details>

      <p className="fit-privacy">
        <ShieldIcon size={16} />
        Your profile is saved on this device only. There is no network call anywhere in this
        feature — nothing is uploaded, and no photographs are used.
      </p>

      <div className="fit-form__actions">
        {showCancel && onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn--accent">
          {submitLabel ?? (existing ? 'Save changes' : 'Save my fit profile')}
        </button>
      </div>
    </form>
  );
}

/**
 * Says plainly what the shopper's current answers can and cannot buy her.
 *
 * This is the honest replacement for an estimator: rather than filling the
 * gaps in silently, the form tells her the gaps exist and what closing them
 * would do.
 */
function MeasurementCoverage({ given }: { given: MeasurementKey[] }) {
  const missing = MEASUREMENT_KEYS.filter((k) => !given.includes(k));

  if (given.length === 0) {
    return (
      <p className="fit-coverage fit-coverage--none">
        With none of these we can&rsquo;t size anything — we&rsquo;ll show you the brand&rsquo;s
        size chart instead of guessing. Even one measurement gives you something.
      </p>
    );
  }

  if (given.length === MEASUREMENT_KEYS.length) {
    return (
      <p className="fit-coverage fit-coverage--full">
        All three — we can compare your whole body against every brand&rsquo;s chart.
      </p>
    );
  }

  return (
    <p className="fit-coverage">
      We&rsquo;ll size you on your{' '}
      {given.map((k) => MEASUREMENT_LABEL[k].toLowerCase()).join(' and ')} alone. Adding your{' '}
      {missing.map((k) => MEASUREMENT_LABEL[k].toLowerCase()).join(' and ')} would let us catch a
      mismatch elsewhere — until then, expect fewer confident answers.
    </p>
  );
}
