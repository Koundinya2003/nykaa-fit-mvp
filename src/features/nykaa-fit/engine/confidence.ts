import type {
  ConfidenceBreakdown,
  ConfidenceLevel,
  FitInputMethod,
} from '../types/fitTypes';

/* =========================================================================
   Confidence — and the decision to say nothing.

   A size recommender that always answers is not a recommender, it is a
   guess with a user interface. The value of this feature depends on the
   shopper being able to trust the answer, and the fastest way to destroy
   that is to name a size in the cases where we genuinely do not know.

   Three things we actually know determine whether we answer:

     input        Did she measure, or did we estimate from height and weight?
                  A measurement is portable across brands; a proxy is not.
     separation   How clearly does the winning size beat the runner-up? If
                  two sizes are effectively tied, picking one is a coin flip.
     brandData    How much fit history does this brand have, and how much
                  does that history agree with itself?

   plus a sanity check:

     absoluteFit  Does the winning size fit at all, or is it merely the
                  least-bad option in the run?

   Below WITHHOLD_BELOW we do not name a size. The UI falls back to the
   brand's published size chart, which is the correct answer to "we don't
   know" and is strictly better than a confident wrong letter.

   The estimated path is additionally CAPPED at medium. It can never read as
   high confidence however clean the arithmetic looks, because the girth
   model has never been validated against a real body. That cap is the
   visible difference between the two input paths.
   ========================================================================= */

/** Weights sum to 1. Separation carries the most because it is the failure
 *  mode that actually produces returns: a shopper genuinely between sizes. */
export const CONFIDENCE_WEIGHTS = {
  separation: 0.4,
  brandData: 0.3,
  absoluteFit: 0.3,
} as const;

/** Inches of distance gap at which the winning size is clearly ahead. */
const CLEAR_SEPARATION_IN = 0.6;

/** Weighted inches of misfit at which no size in the run really works. */
const POOR_FIT_IN = 2;

export const HIGH_AT = 0.72;
export const WITHHOLD_BELOW = 0.48;

/** How much the two input paths are trusted, before any capping. Shown in
 *  the breakdown so the difference is inspectable rather than asserted. */
export const INPUT_CONFIDENCE: Record<FitInputMethod, number> = {
  measured: 1,
  estimated: 0.55,
};

export interface ConfidenceInput {
  method: FitInputMethod;
  /** Weighted inches of misfit for the chosen size. */
  bestDistance: number;
  /** Same for the next-best available size, or null when there isn't one. */
  runnerUpDistance: number | null;
  /** 0-1, from the brand's fit history. */
  brandDataConfidence: number;
  /** True when the recommended size is a substitution for a sold-out one —
   *  we are no longer recommending the size we actually chose. */
  substituted: boolean;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function levelFor(score: number): ConfidenceLevel {
  if (score >= HIGH_AT) return 'high';
  if (score >= WITHHOLD_BELOW) return 'medium';
  return 'low';
}

export function assessConfidence(input: ConfidenceInput): ConfidenceBreakdown {
  const separation =
    input.runnerUpDistance === null
      ? // A single size in the run: nothing to be torn between, but nothing
        // corroborating the choice either.
        0.5
      : clamp01((input.runnerUpDistance - input.bestDistance) / CLEAR_SEPARATION_IN);

  const absoluteFit = clamp01(1 - input.bestDistance / POOR_FIT_IN);
  const brandData = clamp01(input.brandDataConfidence);

  let score =
    CONFIDENCE_WEIGHTS.separation * separation +
    CONFIDENCE_WEIGHTS.brandData * brandData +
    CONFIDENCE_WEIGHTS.absoluteFit * absoluteFit;

  // Falling back to a different size than the one we chose is a weaker claim
  // by construction, whatever the arithmetic behind the original pick said.
  if (input.substituted) score *= 0.8;

  const uncapped = levelFor(score);
  const cappedByEstimate = input.method === 'estimated' && uncapped === 'high';
  const level: ConfidenceLevel = cappedByEstimate ? 'medium' : uncapped;

  return {
    score: round2(score),
    level,
    withheld: level === 'low',
    components: {
      input: INPUT_CONFIDENCE[input.method],
      separation: round2(separation),
      brandData: round2(brandData),
      absoluteFit: round2(absoluteFit),
    },
    limitingFactor: limitingFactorFor(
      { separation, brandData, absoluteFit },
      input.method,
      cappedByEstimate,
    ),
    cappedByEstimate,
  };
}

/**
 * The single most useful sentence in the breakdown: what is actually holding
 * this recommendation back, phrased as something the shopper or the business
 * could do about it.
 */
function limitingFactorFor(
  parts: { separation: number; brandData: number; absoluteFit: number },
  method: FitInputMethod,
  cappedByEstimate: boolean,
): string {
  if (cappedByEstimate) {
    return 'Your measurements are estimated from height and weight — add bust, waist and hip for a higher-confidence answer.';
  }

  const weakest = (
    [
      ['separation', parts.separation] as const,
      ['brandData', parts.brandData] as const,
      ['absoluteFit', parts.absoluteFit] as const,
    ] as const
  ).reduce((a, b) => (b[1] < a[1] ? b : a));

  switch (weakest[0]) {
    case 'separation':
      return 'You sit almost exactly between two sizes on this brand, so neither is clearly right.';
    case 'brandData':
      return "We don't have enough fit history on this brand yet to be sure how its garments run.";
    case 'absoluteFit':
      return method === 'measured'
        ? "No size in this style's run is cut close to your measurements."
        : "No size in this style's run is close to your estimated measurements.";
  }
}

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Not confident enough',
};
