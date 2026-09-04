import type { BodyMeasurements, FitClass } from '@/types';
import type {
  MatchQuality,
  MeasurementVerdict,
  PreferredFit,
  SizeAssessment,
  SizeCharacter,
  SizingHint,
} from '../types/fitTypes';

/* =========================================================================
   Scoring primitives.

   Everything is expressed in inches of ease — the gap between the body a
   size is cut for and the body in front of us. Adjustments shift the *body*
   rather than the chart, so a single comparison drives both the ranking and
   the wording the shopper sees.

   Sign convention: a positive adjustment pushes toward a LARGER size.
   ========================================================================= */

/** How close to the body the cut sits. A slim garment on a given body needs
 *  a larger size to feel the same as a regular one; a relaxed garment needs
 *  a smaller one. */
export const FIT_CLASS_ADJUSTMENT: Record<FitClass, number> = {
  slim: 0.8,
  regular: 0,
  relaxed: -0.8,
  oversized: -1.6,
};

/** What the shopper says they like. Someone who wants a slim fit is happy in
 *  a smaller size than someone who wants room. */
export const PREFERENCE_ADJUSTMENT: Record<PreferredFit, number> = {
  slim: -0.7,
  regular: 0,
  relaxed: 0.9,
};

/** Bust drives dress fit most, then waist, then hip. Weights sum to 1. */
export const MEASUREMENT_WEIGHTS: Record<keyof BodyMeasurements, number> = {
  bust: 0.45,
  waist: 0.35,
  hip: 0.2,
};

export const MEASUREMENT_KEYS: (keyof BodyMeasurements)[] = ['bust', 'waist', 'hip'];

/**
 * Applies every garment-side adjustment to the estimated body, producing the
 * body we should actually look up in the chart.
 *
 * `brandEase` is the room the garment gives versus its published chart, so a
 * garment that runs small (negative ease) is compensated by looking up a
 * larger body — hence the subtraction.
 */
export function effectiveBody(
  body: BodyMeasurements,
  fitClass: FitClass,
  preferredFit: PreferredFit,
  brandEase: number,
): BodyMeasurements {
  const shift =
    FIT_CLASS_ADJUSTMENT[fitClass] + PREFERENCE_ADJUSTMENT[preferredFit] - brandEase;
  return {
    bust: body.bust + shift,
    waist: body.waist + shift,
    hip: body.hip + shift,
  };
}

/** Signed room the size leaves: positive means the garment is bigger. */
export function easeFor(
  chart: BodyMeasurements,
  effective: BodyMeasurements,
): Record<keyof BodyMeasurements, number> {
  return {
    bust: round2(chart.bust - effective.bust),
    waist: round2(chart.waist - effective.waist),
    hip: round2(chart.hip - effective.hip),
  };
}

export function verdictFor(ease: number): MeasurementVerdict {
  if (ease <= -1.6) return 'Tight';
  if (ease <= -0.6) return 'Snug';
  if (ease <= 1.0) return 'Comfortable';
  if (ease <= 2.2) return 'Relaxed';
  return 'Loose';
}

/** Overall character of a size, from its weighted average ease. */
export function characterFor(ease: Record<keyof BodyMeasurements, number>): SizeCharacter {
  const avg = MEASUREMENT_KEYS.reduce((acc, k) => acc + ease[k] * MEASUREMENT_WEIGHTS[k], 0);
  if (avg <= -1.6) return 'Too tight';
  if (avg <= -0.6) return 'Snug';
  if (avg <= 1.0) return 'Regular';
  if (avg <= 2.2) return 'Relaxed';
  return 'Loose';
}

/** Weighted absolute distance in inches. Lower is a better match. */
export function distanceFor(ease: Record<keyof BodyMeasurements, number>): number {
  return round2(
    MEASUREMENT_KEYS.reduce((acc, k) => acc + Math.abs(ease[k]) * MEASUREMENT_WEIGHTS[k], 0),
  );
}

/** Distance mapped to a 0–100 display score. 0 in ≈ 100, 4 in ≈ 0. */
export function scoreFor(distance: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - distance * 25)));
}

export function assessSize(
  size: string,
  chart: BodyMeasurements,
  effective: BodyMeasurements,
  available: boolean,
): SizeAssessment {
  const ease = easeFor(chart, effective);
  const distance = distanceFor(ease);
  return {
    size,
    available,
    distance,
    score: scoreFor(distance),
    character: characterFor(ease),
    verdicts: {
      bust: verdictFor(ease.bust),
      waist: verdictFor(ease.waist),
      hip: verdictFor(ease.hip),
    },
    ease,
  };
}

/**
 * Internal ranking score, 50–94. Blends how well the winning size fits
 * (absolute distance) with how clearly it beats the runner-up (separation).
 *
 * This is NOT a probability that the recommendation is correct. Nothing has
 * been validated against real purchases or returns, so the number is only
 * meaningful relative to other scores from the same heuristic. It is never
 * shown to a shopper — see `matchQualityFor` for what is.
 */
export function matchScoreFor(bestDistance: number, runnerUpDistance: number | null): number {
  const quality = clamp01(1 - bestDistance / 3);
  const separation =
    runnerUpDistance === null ? 0.5 : clamp01((runnerUpDistance - bestDistance) / 1.2);
  return Math.round(Math.max(50, Math.min(94, 50 + 32 * quality + 12 * separation)));
}

/** Distance in inches beyond which no size in the run is a real match — we
 *  are only offering the nearest one. */
const NEAREST_ONLY_DISTANCE = 2;
/**
 * Distance in inches within which the size sits notably well on this body.
 *
 * Calibrated against the catalogue so the label discriminates: across a
 * spread of bodies and fit preferences this splits roughly half "Strong",
 * a third "Good" and the rest "Closest available". A looser threshold made
 * three quarters of all recommendations "Strong match", at which point the
 * label stops being information and starts being a claim.
 */
const STRONG_MATCH_DISTANCE = 0.6;

/**
 * What the shopper is told. Qualitative on purpose: a percentage would imply
 * a validated probability this heuristic cannot support.
 */
export function matchQualityFor(bestDistance: number, substituted: boolean): MatchQuality {
  if (substituted || bestDistance > NEAREST_ONLY_DISTANCE) return 'Closest available size';
  if (bestDistance <= STRONG_MATCH_DISTANCE) return 'Strong match';
  return 'Good match';
}

/**
 * An optional nudge. Fires when the shopper sits between two sizes, or when
 * the recommended size is expected to read snug or roomy on them — the cases
 * where a shopper would reasonably want to make their own call.
 */
export function sizingHintFor(
  chosen: SizeAssessment,
  runnerUp: SizeAssessment | null,
  sizeOrder: string[],
  betweenSizes: boolean,
): SizingHint | null {
  if (betweenSizes && runnerUp) {
    return sizeOrder.indexOf(runnerUp.size) > sizeOrder.indexOf(chosen.size)
      ? 'Consider sizing up'
      : 'Consider sizing down';
  }
  if (chosen.character === 'Snug' || chosen.character === 'Too tight') return 'Consider sizing up';
  if (chosen.character === 'Relaxed' || chosen.character === 'Loose') return 'Consider sizing down';
  return null;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
