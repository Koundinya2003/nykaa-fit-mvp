import type {
  ConfidenceBreakdown,
  ConfidenceLevel,
  MeasurementKey,
  PartialMeasurements,
} from '../types/fitTypes';
import { MEASUREMENT_KEYS, MEASUREMENT_LABEL } from '../types/fitTypes';
import { providedKeys, round2 } from './scoring';

/* =========================================================================
   Confidence — and the decision to say nothing.

   A recommender that always answers is not a recommender, it is a guess
   with a user interface. The value of this feature rests on the shopper
   being able to trust the answer, and the fastest way to destroy that is to
   name a size in the cases where we genuinely do not know.

   Three inputs, and every one of them is something we actually observe —
   there is no term here standing in for data we do not have:

     completeness  How much of her body did she tell us? Three measurements
                   is a real comparison; one is a fragment.
     closeness     How well does the winning size fit those measurements?
     separation    How clearly does it beat the runner-up? Two sizes tied
                   to within a rounding error is a coin flip, not an answer.

   Below WITHHOLD_BELOW we name no size and hand over to the brand's
   published chart. That is the correct output for "we don't know", and it
   is strictly better than a confident wrong letter.
   ========================================================================= */

/**
 * How the evidence is combined.
 *
 * Completeness is a MULTIPLIER, not another term to average in. It is a
 * ceiling on how much the rest can be trusted: a flawless match on a waist
 * measurement alone is still only a statement about a waist, and adding it
 * to a weighted mean would let it buy confidence it has not earned.
 *
 *     score = completeness x (closeness x 0.5 + separation x 0.5)
 *
 * The consequence that matters: a shopper sitting exactly between two sizes
 * scores near zero on separation and is withheld however complete her
 * measurements are — which is the case we most want to decline.
 */
export const CONFIDENCE_WEIGHTS = {
  closeness: 0.5,
  separation: 0.5,
} as const;

/** Inches of distance gap at which the winning size is clearly ahead. */
const CLEAR_SEPARATION_IN = 0.6;

/** Weighted inches of misfit at which no size in the run really works. */
const POOR_FIT_IN = 2;

export const HIGH_AT = 0.72;
export const WITHHOLD_BELOW = 0.45;

/**
 * How much of a body each measurement count represents.
 *
 * Not linear: the jump from one measurement to two is worth more than the
 * jump from two to three, because one alone cannot catch a mismatch
 * anywhere else on the body. One good measurement still earns a usable
 * answer — it just cannot earn a confirmed one.
 */
const COMPLETENESS: Record<number, number> = { 0: 0, 1: 0.55, 2: 0.8, 3: 1 };

export interface ConfidenceInput {
  body: PartialMeasurements;
  /** Weighted inches of misfit for the chosen size. */
  bestDistance: number;
  /** Same for the next-best available size, or null when there isn't one. */
  runnerUpDistance: number | null;
  /** True when the recommended size is a substitution for a sold-out one. */
  substituted: boolean;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function levelFor(score: number): ConfidenceLevel {
  if (score >= HIGH_AT) return 'high';
  if (score >= WITHHOLD_BELOW) return 'medium';
  return 'low';
}

export function assessConfidence(input: ConfidenceInput): ConfidenceBreakdown {
  const given = providedKeys(input.body);
  const missing = MEASUREMENT_KEYS.filter((k) => !given.includes(k));

  const completeness = COMPLETENESS[given.length] ?? 0;
  const closeness = clamp01(1 - input.bestDistance / POOR_FIT_IN);
  const separation =
    input.runnerUpDistance === null
      ? // A single size in the run: nothing to be torn between, but nothing
        // corroborating the choice either.
        0.5
      : clamp01((input.runnerUpDistance - input.bestDistance) / CLEAR_SEPARATION_IN);

  let score =
    completeness *
    (CONFIDENCE_WEIGHTS.closeness * closeness + CONFIDENCE_WEIGHTS.separation * separation);

  // Falling back to a different size than the one we chose is a weaker claim
  // by construction, whatever the arithmetic behind the original pick said.
  if (input.substituted) score *= 0.8;

  score = round2(score);
  const level = levelFor(score);

  return {
    score,
    level,
    withheld: level === 'low',
    components: {
      completeness: round2(completeness),
      closeness: round2(closeness),
      separation: round2(separation),
    },
    limitingFactor: limitingFactorFor({ completeness, closeness, separation }, missing, level),
    missing,
  };
}

/**
 * The most useful sentence in the breakdown: what is holding this answer
 * back, phrased as something the shopper could actually do about it.
 */
function limitingFactorFor(
  parts: { completeness: number; closeness: number; separation: number },
  missing: MeasurementKey[],
  level: ConfidenceLevel,
): string | null {
  // At high confidence nothing is limiting, and inventing a caveat there
  // reads as a contradiction.
  if (level === 'high') return null;

  const weakest = (
    [
      ['completeness', parts.completeness] as const,
      ['separation', parts.separation] as const,
      ['closeness', parts.closeness] as const,
    ] as const
  ).reduce((a, b) => (b[1] < a[1] ? b : a));

  switch (weakest[0]) {
    case 'completeness':
      if (missing.length === 0) return null;
      return `Add your ${listOf(missing.map((k) => MEASUREMENT_LABEL[k].toLowerCase()))} and we can compare the whole chart, not just part of it.`;
    case 'separation':
      return 'You sit almost exactly between two sizes on this brand, so neither is clearly right.';
    case 'closeness':
      return "No size in this style's run is cut close to your measurements.";
  }
}

/** "bust and hip", "bust, waist and hip". */
export function listOf(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Not confident enough',
};
