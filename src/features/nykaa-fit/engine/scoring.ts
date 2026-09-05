import type { BodyMeasurements, FitClass } from '@/types';
import type {
  MeasurementComparison,
  MeasurementKey,
  MeasurementVerdict,
  PartialMeasurements,
  PreferredFit,
  SizeAssessment,
  SizeCharacter,
  SizingHint,
} from '../types/fitTypes';
import { MEASUREMENT_KEYS } from '../types/fitTypes';

/* =========================================================================
   Scoring primitives.

   Everything is in inches of ease — the gap between the body a size is cut
   for and the body in front of us, after the room the shopper asked for.

   Two properties matter here and are enforced by the types:

   1. Only measurements the shopper actually gave are ever compared. A
      missing hip measurement produces a null comparison, not a guessed one,
      and the weights renormalise over what is present.
   2. Nothing shifts the answer invisibly. The one adjustment applied is the
      ease target, which is composed of the garment's cut and the shopper's
      stated preference — both shown to her, in inches, on the receipt.
   ========================================================================= */

/**
 * How much room a cut is designed to leave over the body it is cut for.
 *
 * A bodycon sits on the body; an oversized style stands away from it. To get
 * the same *felt* fit, a close cut needs to be matched against a slightly
 * larger chart body and a loose cut against a slightly smaller one.
 *
 * Sign convention throughout: positive means "look for a size cut for a
 * bigger body", i.e. push toward a larger size.
 */
export const CUT_EASE: Record<FitClass, number> = {
  slim: 0.8,
  regular: 0,
  relaxed: -0.8,
  oversized: -1.6,
};

export const CUT_EASE_LABEL: Record<FitClass, string> = {
  slim: 'Close-fitting cut',
  regular: 'Regular cut',
  relaxed: 'Relaxed cut',
  oversized: 'Oversized cut',
};

/** What the shopper says she likes. The only preference that moves the answer. */
export const PREFERENCE_EASE: Record<PreferredFit, number> = {
  slim: -0.7,
  regular: 0,
  relaxed: 0.9,
};

export const PREFERENCE_LABEL: Record<PreferredFit, string> = {
  slim: 'Slim — close to the body',
  regular: 'Regular — true to size',
  relaxed: 'Relaxed — room to move',
};

/** Relative importance when all three are present. Renormalised over
 *  whichever measurements the shopper actually gave. */
const BASE_WEIGHTS: Record<MeasurementKey, number> = {
  bust: 0.45,
  waist: 0.35,
  hip: 0.2,
};

/** The measurements this profile can actually be scored on. */
export function providedKeys(body: PartialMeasurements): MeasurementKey[] {
  return MEASUREMENT_KEYS.filter((k) => typeof body[k] === 'number' && !Number.isNaN(body[k]));
}

/** Weights over the provided measurements only, summing to 1. Returns an
 *  empty map when nothing was provided. */
export function weightsFor(keys: MeasurementKey[]): Record<string, number> {
  const total = keys.reduce((acc, k) => acc + BASE_WEIGHTS[k], 0);
  if (total === 0) return {};
  return Object.fromEntries(keys.map((k) => [k, BASE_WEIGHTS[k] / total]));
}

/** The room the shopper is asking for, in inches, from the garment's cut
 *  and her stated preference. Everything that moves the answer is here. */
export function easeTargetFor(fitClass: FitClass, preferredFit: PreferredFit): number {
  return round2(CUT_EASE[fitClass] + PREFERENCE_EASE[preferredFit]);
}

export function verdictFor(ease: number): MeasurementVerdict {
  if (ease <= -1.6) return 'Tight';
  if (ease <= -0.6) return 'Snug';
  if (ease <= 1.0) return 'Comfortable';
  if (ease <= 2.2) return 'Relaxed';
  return 'Loose';
}

function characterFor(
  comparisons: MeasurementComparison[],
  weights: Record<string, number>,
): SizeCharacter {
  const avg = comparisons.reduce(
    (acc, c) => (c.ease === null ? acc : acc + c.ease * (weights[c.key] ?? 0)),
    0,
  );
  if (avg <= -1.6) return 'Too tight';
  if (avg <= -0.6) return 'Snug';
  if (avg <= 1.0) return 'Regular';
  if (avg <= 2.2) return 'Relaxed';
  return 'Loose';
}

/**
 * Compares one size against the shopper's body.
 *
 * `ease` is what the size leaves her *after* the room she asked for: a value
 * of 0 means this size is cut for exactly the body-plus-ease she wants.
 */
export function assessSize(
  size: string,
  chart: BodyMeasurements,
  body: PartialMeasurements,
  easeTarget: number,
  available: boolean,
): SizeAssessment {
  const keys = providedKeys(body);
  const weights = weightsFor(keys);

  const comparisons: MeasurementComparison[] = MEASUREMENT_KEYS.map((key) => {
    const yours = body[key];
    if (typeof yours !== 'number') {
      return { key, yours: null, chart: chart[key], ease: null, verdict: null };
    }
    // Positive = this size is cut roomier than she asked for.
    const ease = round2(chart[key] - (yours + easeTarget));
    return { key, yours, chart: chart[key], ease, verdict: verdictFor(ease) };
  });

  const distance = round2(
    comparisons.reduce(
      (acc, c) => (c.ease === null ? acc : acc + Math.abs(c.ease) * (weights[c.key] ?? 0)),
      0,
    ),
  );

  return {
    size,
    available,
    distance,
    character: characterFor(comparisons, weights),
    comparisons,
  };
}

/**
 * An optional nudge, for the cases where a shopper would reasonably want to
 * make her own call.
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

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
