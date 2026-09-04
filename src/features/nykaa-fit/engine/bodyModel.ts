import type { BodyMeasurements } from '@/types';
import type { BodyShape, FitGender, FitProfile } from '../types/fitTypes';

/* =========================================================================
   Body estimation.

   Turns height + weight (+ optional age and body shape) into estimated bust,
   waist and hip in inches.

   The model is a girth index rather than a raw BMI lookup. Approximating the
   torso as a cylinder of roughly constant density, volume ∝ height × girth²,
   so girth ∝ √(mass / height). Circumferences are then linear in that index,
   with a small additional term for frame size at a given index.

   This is a plausible, transparent heuristic — not a clinical measurement.
   Every coefficient below is anchored to a stated reference body so the
   behaviour is inspectable and testable rather than a magic constant.
   ========================================================================= */

export interface GenderModel {
  /** Reference body the coefficients are anchored to. */
  refHeightCm: number;
  refWeightKg: number;
  ref: BodyMeasurements;
  /** Inches added per unit of girth index. */
  perGirth: BodyMeasurements;
  /** Inches added per 10 cm of height above the reference. */
  perHeight: BodyMeasurements;
}

// Coefficients differ per measurement on purpose: waist responds fastest to
// added mass, and hips gain slightly faster than the bust, while extra height
// lengthens the frame more than it widens the hip. Without this the three
// measurements would move in lockstep and every size would read identically.
const FEMALE_MODEL: GenderModel = {
  refHeightCm: 160,
  refWeightKg: 58,
  ref: { bust: 35, waist: 29, hip: 37.5 },
  perGirth: { bust: 4.2, waist: 4.85, hip: 4.5 },
  perHeight: { bust: 0.45, waist: 0.3, hip: 0.3 },
};

const MALE_MODEL: GenderModel = {
  refHeightCm: 175,
  refWeightKg: 72,
  ref: { bust: 38.5, waist: 32, hip: 38 },
  perGirth: { bust: 5.3, waist: 5.6, hip: 4.6 },
  perHeight: { bust: 0.5, waist: 0.3, hip: 0.4 },
};

/** Midpoint of the two models, used when gender is not disclosed. */
const UNSPECIFIED_MODEL: GenderModel = {
  refHeightCm: 168,
  refWeightKg: 65,
  ref: { bust: 36.5, waist: 30.5, hip: 37.75 },
  perGirth: { bust: 4.75, waist: 5.2, hip: 4.4 },
  perHeight: { bust: 0.45, waist: 0.32, hip: 0.42 },
};

export function modelFor(gender: FitGender): GenderModel {
  if (gender === 'male') return MALE_MODEL;
  if (gender === 'unspecified') return UNSPECIFIED_MODEL;
  return FEMALE_MODEL;
}

/** √(kg / m) — see the module comment. */
export function girthIndex(heightCm: number, weightKg: number): number {
  return Math.sqrt(weightKg / (heightCm / 100));
}

/** Waist and hip redistribution for a stated body shape, in inches. */
const SHAPE_ADJUSTMENTS: Record<BodyShape, Partial<BodyMeasurements>> = {
  hourglass: { waist: -1.0, hip: 0.5 },
  pear: { bust: -0.5, hip: 1.2 },
  apple: { waist: 1.2, hip: -0.5 },
  rectangle: { waist: 0.4, hip: -0.3 },
  athletic: { bust: 0.5, waist: -0.8 },
};

export function estimateBody(profile: FitProfile): BodyMeasurements {
  const model = modelFor(profile.gender);
  const g = girthIndex(profile.heightCm, profile.weightKg);
  const refG = girthIndex(model.refHeightCm, model.refWeightKg);
  const dG = g - refG;
  const dH = (profile.heightCm - model.refHeightCm) / 10;

  const body: BodyMeasurements = {
    bust: model.ref.bust + model.perGirth.bust * dG + model.perHeight.bust * dH,
    waist: model.ref.waist + model.perGirth.waist * dG + model.perHeight.waist * dH,
    hip: model.ref.hip + model.perGirth.hip * dG + model.perHeight.hip * dH,
  };

  // Waists thicken gently with age; nothing else moves much.
  if (typeof profile.age === 'number' && profile.age > 30) {
    body.waist += Math.min(1.2, ((profile.age - 30) / 10) * 0.35);
  }

  if (profile.bodyShape) {
    const adj = SHAPE_ADJUSTMENTS[profile.bodyShape];
    body.bust += adj.bust ?? 0;
    body.waist += adj.waist ?? 0;
    body.hip += adj.hip ?? 0;
  }

  return {
    bust: roundTenth(body.bust),
    waist: roundTenth(body.waist),
    hip: roundTenth(body.hip),
  };
}

function roundTenth(n: number): number {
  return Math.round(n * 10) / 10;
}
