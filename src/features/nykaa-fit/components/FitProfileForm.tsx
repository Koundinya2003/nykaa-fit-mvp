import { useState } from 'react';
import type {
  BodyShape,
  FieldErrors,
  FitGender,
  FitInputMethod,
  FitProfile,
  FitProfileDraft,
  PreferredFit,
} from '../types/fitTypes';
import { ShieldIcon, RulerIcon } from '@/components/Icons';
import '../styles/nykaa-fit.css';

/* =========================================================================
   The four questions.

   Bust, waist, hip and height are the PRIMARY path, and they are primary for
   one reason: a measurement means the same thing in every brand and a size
   label does not. 34″ is 34″ at Kazo and at W for Woman. "Medium" is not.

   Height and weight are kept as an explicit escape hatch for the shopper who
   does not have a tape measure to hand — clearly labelled as an estimate,
   and capped at medium confidence everywhere downstream. That cap is not
   decoration: it is the honest consequence of guessing three girths from two
   numbers.
   ========================================================================= */

interface Props {
  /** Prefills the form when the shopper is editing an existing profile. */
  existing: FitProfile | null;
  onSubmit: (profile: Omit<FitProfile, 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const PREFERRED_FITS: { id: PreferredFit; label: string; hint: string }[] = [
  { id: 'slim', label: 'Slim', hint: 'Close to the body' },
  { id: 'regular', label: 'Regular', hint: 'True to size' },
  { id: 'relaxed', label: 'Relaxed', hint: 'Room to move' },
];

const GENDERS: { id: FitGender; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'unspecified', label: 'Prefer not to say' },
];

const BODY_SHAPES: { id: BodyShape; label: string }[] = [
  { id: 'hourglass', label: 'Hourglass' },
  { id: 'pear', label: 'Pear' },
  { id: 'apple', label: 'Apple' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'athletic', label: 'Athletic' },
];

const MEASUREMENT_FIELDS: {
  key: 'bustIn' | 'waistIn' | 'hipIn';
  label: string;
  placeholder: string;
  how: string;
}[] = [
  {
    key: 'bustIn',
    label: 'Bust',
    placeholder: '34',
    how: 'Around the fullest part, tape level under the arms',
  },
  {
    key: 'waistIn',
    label: 'Waist',
    placeholder: '28',
    how: 'Around the narrowest part, usually just above the navel',
  },
  {
    key: 'hipIn',
    label: 'Hip',
    placeholder: '38',
    how: 'Around the fullest part, roughly 20 cm below the waist',
  },
];

const LIMITS = {
  height: { min: 120, max: 220 },
  weight: { min: 30, max: 200 },
  age: { min: 13, max: 100 },
  girth: { min: 24, max: 60 },
};

function toDraft(profile: FitProfile | null): FitProfileDraft {
  return {
    method: profile?.method ?? 'measured',
    bustIn: profile?.measurements ? String(profile.measurements.bust) : '',
    waistIn: profile?.measurements ? String(profile.measurements.waist) : '',
    hipIn: profile?.measurements ? String(profile.measurements.hip) : '',
    heightCm: profile ? String(profile.heightCm) : '',
    weightKg: profile?.weightKg ? String(profile.weightKg) : '',
    gender: profile?.gender ?? '',
    preferredFit: profile?.preferredFit ?? '',
    age: profile?.age ? String(profile.age) : '',
    bodyShape: profile?.bodyShape ?? '',
  };
}

function numberField(
  value: string,
  label: string,
  limits: { min: number; max: number },
  unit: string,
): string | undefined {
  if (!value.trim()) return `${label} is required`;
  const n = Number(value);
  if (!Number.isFinite(n) || n < limits.min || n > limits.max)
    return `Enter a ${label.toLowerCase()} between ${limits.min} and ${limits.max} ${unit}`;
  return undefined;
}

export function validate(draft: FitProfileDraft): FieldErrors {
  const errors: FieldErrors = {};

  errors.heightCm = numberField(draft.heightCm, 'Height', LIMITS.height, 'cm');

  if (draft.method === 'measured') {
    errors.bustIn = numberField(draft.bustIn, 'Bust', LIMITS.girth, 'inches');
    errors.waistIn = numberField(draft.waistIn, 'Waist', LIMITS.girth, 'inches');
    errors.hipIn = numberField(draft.hipIn, 'Hip', LIMITS.girth, 'inches');
  } else {
    errors.weightKg = numberField(draft.weightKg, 'Weight', LIMITS.weight, 'kg');
  }

  if (!draft.gender) errors.gender = 'Select an option';
  if (!draft.preferredFit) errors.preferredFit = 'Choose how you like clothes to fit';

  if (draft.age.trim()) {
    const age = Number(draft.age);
    if (!Number.isFinite(age) || age < LIMITS.age.min || age > LIMITS.age.max)
      errors.age = `Enter an age between ${LIMITS.age.min} and ${LIMITS.age.max}`;
  }

  // Strip the undefined keys so callers can just count them.
  (Object.keys(errors) as (keyof FieldErrors)[]).forEach((k) => {
    if (errors[k] === undefined) delete errors[k];
  });

  return errors;
}

/** cm -> a familiar ft/in reading, shown as a live hint. */
function feetInches(cm: number): string | null {
  if (!Number.isFinite(cm) || cm < LIMITS.height.min || cm > LIMITS.height.max) return null;
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return inches === 12 ? `${feet + 1}′ 0″` : `${feet}′ ${inches}″`;
}

export default function FitProfileForm({ existing, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState<FitProfileDraft>(() => toDraft(existing));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showOptional, setShowOptional] = useState(Boolean(existing?.age || existing?.bodyShape));

  const set = <K extends keyof FitProfileDraft>(key: K, value: FitProfileDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setMethod = (method: FitInputMethod) => {
    setDraft((d) => ({ ...d, method }));
    setErrors({});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(draft);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    const shared = {
      heightCm: Number(draft.heightCm),
      gender: draft.gender as FitGender,
      preferredFit: draft.preferredFit as PreferredFit,
      age: draft.age.trim() ? Number(draft.age) : undefined,
    };

    onSubmit(
      draft.method === 'measured'
        ? {
            ...shared,
            method: 'measured',
            measurements: {
              bust: Number(draft.bustIn),
              waist: Number(draft.waistIn),
              hip: Number(draft.hipIn),
            },
          }
        : {
            ...shared,
            method: 'estimated',
            weightKg: Number(draft.weightKg),
            bodyShape: draft.bodyShape ? (draft.bodyShape as BodyShape) : undefined,
          },
    );
  };

  const heightHint = feetInches(Number(draft.heightCm));
  const measured = draft.method === 'measured';

  return (
    <form className="fit-form" onSubmit={submit} noValidate>
      <div className="fit-method" role="radiogroup" aria-label="How would you like to tell us your size?">
        <button
          type="button"
          role="radio"
          aria-checked={measured}
          className={`fit-method__opt ${measured ? 'is-active' : ''}`}
          onClick={() => setMethod('measured')}
        >
          <span className="fit-method__label">
            <RulerIcon size={15} />I know my measurements
          </span>
          <span className="fit-method__hint">Bust, waist, hip · highest confidence</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!measured}
          className={`fit-method__opt ${!measured ? 'is-active' : ''}`}
          onClick={() => setMethod('estimated')}
        >
          <span className="fit-method__label">I don&rsquo;t know my measurements</span>
          <span className="fit-method__hint">We estimate from height &amp; weight · lower confidence</span>
        </button>
      </div>

      {measured ? (
        <>
          <p className="fit-method__why">
            A measurement means the same thing in every brand. A size label does not — which is
            exactly why the same shopper is an M at one label and an L at another.
          </p>

          <div className="fit-form__row fit-form__row--three">
            {MEASUREMENT_FIELDS.map((field) => (
              <label className="fit-field" key={field.key}>
                <span className="fit-field__label">{field.label}</span>
                <span className="fit-field__control">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={field.placeholder}
                    value={draft[field.key]}
                    aria-invalid={Boolean(errors[field.key])}
                    aria-describedby={`how-${field.key}`}
                    onChange={(e) => set(field.key, e.target.value.replace(/[^\d.]/g, ''))}
                  />
                  <span className="fit-field__unit">in</span>
                </span>
                {errors[field.key] ? (
                  <span className="fit-field__error" role="alert">
                    {errors[field.key]}
                  </span>
                ) : (
                  <span className="fit-field__hint" id={`how-${field.key}`}>
                    {field.how}
                  </span>
                )}
              </label>
            ))}
          </div>
        </>
      ) : (
        <p className="fit-method__why fit-method__why--warn">
          We&rsquo;ll estimate your bust, waist and hip from your height and weight. It works, but
          it is a proxy — two people at the same height and weight are not the same shape, so this
          path never reads as high confidence.
        </p>
      )}

      <div className="fit-form__row">
        <label className="fit-field">
          <span className="fit-field__label">Height</span>
          <span className="fit-field__control">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="165"
              value={draft.heightCm}
              aria-invalid={Boolean(errors.heightCm)}
              aria-describedby={errors.heightCm ? 'err-height' : undefined}
              onChange={(e) => set('heightCm', e.target.value.replace(/[^\d.]/g, ''))}
            />
            <span className="fit-field__unit">cm</span>
          </span>
          {errors.heightCm ? (
            <span className="fit-field__error" id="err-height" role="alert">
              {errors.heightCm}
            </span>
          ) : (
            heightHint && <span className="fit-field__hint">{heightHint}</span>
          )}
        </label>

        {!measured && (
          <label className="fit-field">
            <span className="fit-field__label">Weight</span>
            <span className="fit-field__control">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="60"
                value={draft.weightKg}
                aria-invalid={Boolean(errors.weightKg)}
                aria-describedby={errors.weightKg ? 'err-weight' : undefined}
                onChange={(e) => set('weightKg', e.target.value.replace(/[^\d.]/g, ''))}
              />
              <span className="fit-field__unit">kg</span>
            </span>
            {errors.weightKg && (
              <span className="fit-field__error" id="err-weight" role="alert">
                {errors.weightKg}
              </span>
            )}
          </label>
        )}
      </div>

      <fieldset className="fit-fieldset">
        <legend className="fit-field__label">Gender</legend>
        <div className="fit-choices">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`fit-choice ${draft.gender === g.id ? 'is-active' : ''}`}
              aria-pressed={draft.gender === g.id}
              onClick={() => set('gender', g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
        {errors.gender && (
          <span className="fit-field__error" role="alert">
            {errors.gender}
          </span>
        )}
      </fieldset>

      <fieldset className="fit-fieldset">
        <legend className="fit-field__label">Preferred fit</legend>
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
        {errors.preferredFit && (
          <span className="fit-field__error" role="alert">
            {errors.preferredFit}
          </span>
        )}
      </fieldset>

      <div className="fit-optional">
        <button
          type="button"
          className="fit-optional__toggle"
          aria-expanded={showOptional}
          onClick={() => setShowOptional((s) => !s)}
        >
          {showOptional ? 'Hide optional details' : 'Add optional details for a closer match'}
        </button>

        {showOptional && (
          <div className="fit-optional__body">
            <div className="fit-form__row">
              <label className="fit-field">
                <span className="fit-field__label">
                  Age <span className="fit-field__opt">optional</span>
                </span>
                <span className="fit-field__control">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="28"
                    value={draft.age}
                    aria-invalid={Boolean(errors.age)}
                    onChange={(e) => set('age', e.target.value.replace(/[^\d]/g, ''))}
                  />
                </span>
                {errors.age && (
                  <span className="fit-field__error" role="alert">
                    {errors.age}
                  </span>
                )}
              </label>
            </div>

            {!measured && (
              <fieldset className="fit-fieldset">
                <legend className="fit-field__label">
                  Body shape <span className="fit-field__opt">optional</span>
                </legend>
                <p className="fit-field__hint">
                  Only used on the estimated path — it redistributes the waist and hip guess.
                </p>
                <div className="fit-choices">
                  {BODY_SHAPES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`fit-choice ${draft.bodyShape === s.id ? 'is-active' : ''}`}
                      aria-pressed={draft.bodyShape === s.id}
                      onClick={() => set('bodyShape', draft.bodyShape === s.id ? '' : s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        )}
      </div>

      <p className="fit-privacy">
        <ShieldIcon size={16} />
        Your fit profile is saved on this device only. There is no network call anywhere in this
        feature — nothing is uploaded, and no photographs are used.
      </p>

      <div className="fit-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn--accent">
          {existing ? 'Update my fit' : 'Get my size'}
        </button>
      </div>
    </form>
  );
}
