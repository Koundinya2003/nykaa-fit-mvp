import { useState } from 'react';
import type {
  BodyShape,
  FieldErrors,
  FitGender,
  FitProfile,
  FitProfileDraft,
  PreferredFit,
} from '../types/fitTypes';
import { ShieldIcon } from '@/components/Icons';
import '../styles/nykaa-fit.css';

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

const LIMITS = {
  height: { min: 120, max: 220 },
  weight: { min: 30, max: 200 },
  age: { min: 13, max: 100 },
};

function toDraft(profile: FitProfile | null): FitProfileDraft {
  return {
    heightCm: profile ? String(profile.heightCm) : '',
    weightKg: profile ? String(profile.weightKg) : '',
    gender: profile?.gender ?? '',
    preferredFit: profile?.preferredFit ?? '',
    age: profile?.age ? String(profile.age) : '',
    bodyShape: profile?.bodyShape ?? '',
  };
}

function validate(draft: FitProfileDraft): FieldErrors {
  const errors: FieldErrors = {};

  const height = Number(draft.heightCm);
  if (!draft.heightCm.trim()) errors.heightCm = 'Height is required';
  else if (!Number.isFinite(height) || height < LIMITS.height.min || height > LIMITS.height.max)
    errors.heightCm = `Enter a height between ${LIMITS.height.min} and ${LIMITS.height.max} cm`;

  const weight = Number(draft.weightKg);
  if (!draft.weightKg.trim()) errors.weightKg = 'Weight is required';
  else if (!Number.isFinite(weight) || weight < LIMITS.weight.min || weight > LIMITS.weight.max)
    errors.weightKg = `Enter a weight between ${LIMITS.weight.min} and ${LIMITS.weight.max} kg`;

  if (!draft.gender) errors.gender = 'Select an option';
  if (!draft.preferredFit) errors.preferredFit = 'Choose how you like clothes to fit';

  if (draft.age.trim()) {
    const age = Number(draft.age);
    if (!Number.isFinite(age) || age < LIMITS.age.min || age > LIMITS.age.max)
      errors.age = `Enter an age between ${LIMITS.age.min} and ${LIMITS.age.max}`;
  }

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(draft);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSubmit({
      heightCm: Number(draft.heightCm),
      weightKg: Number(draft.weightKg),
      gender: draft.gender as FitGender,
      preferredFit: draft.preferredFit as PreferredFit,
      age: draft.age.trim() ? Number(draft.age) : undefined,
      bodyShape: draft.bodyShape ? (draft.bodyShape as BodyShape) : undefined,
    });
  };

  const heightHint = feetInches(Number(draft.heightCm));

  return (
    <form className="fit-form" onSubmit={submit} noValidate>
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

            <fieldset className="fit-fieldset">
              <legend className="fit-field__label">
                Body shape <span className="fit-field__opt">optional</span>
              </legend>
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
          </div>
        )}
      </div>

      <p className="fit-privacy">
        <ShieldIcon size={16} />
        Your fit profile is saved securely on this device for your shopping experience. It is never
        uploaded, and no photographs are used.
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
