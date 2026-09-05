import { PRODUCTS } from '@/data/products';
import { getReviews } from '@/data/reviews';
import { getOutcomes, type OutcomeRecord } from '../utils/fitOutcomes';
import { isFitEligible } from '../utils/eligibility';

/* =========================================================================
   Per-brand fit history.

   The cross-brand panel is the strongest claim this feature makes — "your
   size isn't universal" — so it must not be driven by a constant somebody
   typed in. This module derives, per brand, from data the app actually
   holds:

     samples      how much fit evidence exists for the brand at all
     ease         inches the brand's garments run versus their own chart,
                  estimated from that evidence
     consistency  how much the evidence AGREES. A brand where every shopper
                  says the same thing is predictable; one where half say
                  "runs small" and half say "runs large" is not, however
                  many datapoints it has.

   Two sources feed it:

     1. Review fit feedback ("Runs small" / "True to size" / "Runs large")
        across every fit-eligible product of that brand. Plentiful, but it
        is an opinion.
     2. Outcomes the shopper reported after buying (kept / returned, with a
        reason). Rarer, and weighted far higher, because a return is a
        measured consequence rather than a sentiment — and because it is the
        signal the business is actually paying for.

   The published `brandSizing.ease` is not thrown away: it is the prior. The
   observed estimate is blended into it in proportion to how much evidence
   exists, so a brand with two datapoints stays close to its published label
   and a brand with forty is driven by what happened.
   ========================================================================= */

/** Inches of ease each signal implies. A "runs small" garment gives less
 *  room than its chart claims, hence negative. */
const REVIEW_EASE: Record<string, number> = {
  'Runs small': -0.7,
  'True to size': 0,
  'Runs large': 0.7,
};

/** A return for a size reason is a strong, directional signal. */
const RETURN_EASE: Record<string, number> = {
  'too-small': -1.1,
  'too-large': 1.1,
};

/** Relative weights. A reported outcome is worth six reviews: it is the
 *  consequence the recommendation was trying to avoid, not a comment. */
const WEIGHT_REVIEW = 1;
const WEIGHT_RETURN = 6;
/** A keep is real evidence that the size was right, but it says nothing
 *  about which direction the brand runs — it pulls the estimate toward the
 *  size the shopper actually bought, i.e. toward zero correction. */
const WEIGHT_KEEP = 3;

/**
 * How much the published label is worth, in the same units as the evidence.
 *
 * The blend is shrinkage toward a prior rather than a ramp to a cutoff:
 *
 *     blend = weight / (weight + PRIOR_STRENGTH)
 *
 * which is the right shape for this problem. Fit feedback is a noisy
 * three-point opinion, so the mean of a dozen of them has a standard error
 * of roughly a quarter of an inch — comparable to the corrections being
 * estimated. A linear ramp to "fully trust the observation at N datapoints"
 * would hand that noise the whole answer the moment N was reached; shrinkage
 * never discards the brand's own chart, and lets evidence earn influence in
 * proportion to how much of it there is.
 *
 * At 20, a brand with a single product (about 6 review points) stays close
 * to its published label, a brand with three products moves noticeably, and
 * a couple of reported returns — worth six each — visibly move any brand.
 */
const PRIOR_STRENGTH = 20;

/** Evidence at which the volume half of the confidence score saturates.
 *  Separate from PRIOR_STRENGTH: how much we believe the estimate is a
 *  different question from how far we move toward it. */
const VOLUME_HALF_WEIGHT = 10;

/** Below this much evidence we decline to characterise the brand at all. */
const MIN_WEIGHT_TO_DESCRIBE = 5;

/** Shrinkage factor: 0 with no evidence, approaching 1 with a lot. */
function blendFor(weight: number): number {
  return weight / (weight + PRIOR_STRENGTH);
}

export interface BrandFitHistory {
  brand: string;
  /** Weighted evidence, not a raw row count. */
  weight: number;
  /** Raw counts, for display. */
  reviewCount: number;
  outcomeCount: number;
  returnCount: number;
  /** Ease implied by the evidence alone, in inches. Null with no evidence. */
  observedEase: number | null;
  /** The brand's published claim, in inches. */
  publishedEase: number;
  /** What the engine actually applies: published blended with observed. */
  appliedEase: number;
  /** 0-1. How much the evidence agrees with itself. */
  consistency: number;
  /** 0-1 composite feeding the confidence model: volume x agreement. */
  dataConfidence: number;
  /** Plain-language read-out for the UI. */
  label: string;
  /** True when reported outcomes have moved the applied ease away from the
   *  published label — the visible proof that the loop is closed. */
  shiftedByOutcomes: boolean;
  /** Inches the reported outcomes moved it. Signed. */
  outcomeShift: number;
}

interface Signal {
  ease: number;
  weight: number;
}

/* ---------- review signals (static: derived from the catalogue) ---------- */

let reviewSignalCache: Map<string, Signal[]> | undefined;

/**
 * Fit feedback per brand, aggregated across everything that brand sells.
 *
 * Deliberately not restricted to the dresses the engine currently runs on:
 * how a label's garments run relative to its own chart is a property of the
 * label's blocks and factories, so a Vero Moda top tells us something real
 * about a Vero Moda dress. The consequence is an honestly uneven corpus —
 * brands with one product carry thin history, and the confidence model
 * declines to name a size on them, which is the correct behaviour rather
 * than a gap to paper over.
 */
function reviewSignals(): Map<string, Signal[]> {
  if (reviewSignalCache) return reviewSignalCache;
  const map = new Map<string, Signal[]>();
  PRODUCTS.forEach((product) => {
    const list = map.get(product.brand) ?? [];
    getReviews(product.id).forEach((review) => {
      list.push({ ease: REVIEW_EASE[review.fitFeedback] ?? 0, weight: WEIGHT_REVIEW });
    });
    map.set(product.brand, list);
  });
  reviewSignalCache = map;
  return map;
}

/* ---------- outcome signals (live: change as the shopper reports) ---------- */

function outcomeSignals(brand: string, outcomes: OutcomeRecord[]): Signal[] {
  return outcomes
    .filter((o) => o.brand === brand)
    .map((o): Signal | null => {
      if (o.outcome === 'kept') return { ease: 0, weight: WEIGHT_KEEP };
      // A return for style or quality is recorded, but it is not evidence
      // about sizing and must not move the ease estimate.
      const ease = o.reason ? RETURN_EASE[o.reason] : undefined;
      return ease === undefined ? null : { ease, weight: WEIGHT_RETURN };
    })
    .filter((s): s is Signal => s !== null);
}

/* ---------- aggregation ---------- */

function weightedMean(signals: Signal[]): number {
  const w = signals.reduce((acc, s) => acc + s.weight, 0);
  if (w === 0) return 0;
  return signals.reduce((acc, s) => acc + s.ease * s.weight, 0) / w;
}

/**
 * Agreement, expressed as 1 - (spread / maximum possible spread).
 *
 * Weighted standard deviation is the natural measure here: signals live on
 * a bounded scale (-1.1 .. +1.1 inches), so dividing by that bound turns the
 * deviation into a 0-1 agreement score that is comparable across brands.
 */
function consistencyOf(signals: Signal[]): number {
  if (signals.length < 2) return 0.5; // Not enough to claim either way.
  const mean = weightedMean(signals);
  const w = signals.reduce((acc, s) => acc + s.weight, 0);
  const variance =
    signals.reduce((acc, s) => acc + s.weight * (s.ease - mean) ** 2, 0) / w;
  const sd = Math.sqrt(variance);
  return clamp01(1 - sd / 1.1);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function describe(ease: number, consistency: number, weight: number): string {
  if (weight < MIN_WEIGHT_TO_DESCRIBE) return 'Not enough fit history yet';
  const direction =
    ease <= -0.3 ? 'runs small' : ease >= 0.3 ? 'runs large' : 'runs true to its chart';
  const agreement =
    consistency >= 0.7 ? 'consistently' : consistency >= 0.45 ? 'usually' : 'unpredictably';
  return `${agreement} ${direction}`;
}

/**
 * Everything known about how a brand's garments actually fit.
 *
 * `outcomes` is passed in rather than read here so the function stays pure
 * and testable; callers use `brandFitHistory` below, which supplies the
 * live store.
 */
export function computeBrandFitHistory(
  brand: string,
  /** Only the published ease is used, so a bare `{ ease }` is enough — which
   *  keeps the engine's loose FitProductInput shape assignable here. */
  publishedSizing: { ease: number } | undefined,
  outcomes: OutcomeRecord[],
): BrandFitHistory {
  const reviews = reviewSignals().get(brand) ?? [];
  const brandOutcomes = outcomes.filter((o) => o.brand === brand);
  const outcomeSigs = outcomeSignals(brand, outcomes);
  const signals = [...reviews, ...outcomeSigs];

  const weight = signals.reduce((acc, s) => acc + s.weight, 0);
  const publishedEase = publishedSizing?.ease ?? 0;
  const observedEase = signals.length > 0 ? weightedMean(signals) : null;
  const consistency = consistencyOf(signals);

  // Shrink the published label toward what shoppers reported, in proportion
  // to how much they reported.
  const blend = blendFor(weight);
  const appliedEase =
    observedEase === null ? publishedEase : publishedEase * (1 - blend) + observedEase * blend;

  // What the same brand would look like with the reported outcomes removed —
  // the difference is the visible proof that the feedback loop is wired up.
  const withoutOutcomes = (() => {
    const w = reviews.reduce((acc, s) => acc + s.weight, 0);
    if (w === 0) return publishedEase;
    const b = blendFor(w);
    return publishedEase * (1 - b) + weightedMean(reviews) * b;
  })();

  const outcomeShift = round2(appliedEase - withoutOutcomes);

  return {
    brand,
    weight: round2(weight),
    reviewCount: reviews.length,
    outcomeCount: brandOutcomes.length,
    returnCount: brandOutcomes.filter((o) => o.outcome === 'returned').length,
    observedEase: observedEase === null ? null : round2(observedEase),
    publishedEase,
    appliedEase: round2(appliedEase),
    consistency: round2(consistency),
    // Volume and agreement both matter, and neither substitutes for the
    // other: forty contradictory reports are not a reliable brand.
    dataConfidence: round2(
      (weight / (weight + VOLUME_HALF_WEIGHT)) * 0.5 + consistency * 0.5,
    ),
    label: describe(appliedEase, consistency, weight),
    shiftedByOutcomes: Math.abs(outcomeShift) >= 0.05,
    outcomeShift,
  };
}

/** Live read against the outcome store. */
export function brandFitHistory(
  brand: string,
  publishedSizing?: { ease: number },
): BrandFitHistory {
  return computeBrandFitHistory(brand, publishedSizing, getOutcomes());
}

/** Every brand Nykaa Fit runs on, with its history. Used by /metrics and by
 *  the cross-brand panel. */
export function allBrandFitHistories(): BrandFitHistory[] {
  const brands = new Set(PRODUCTS.filter(isFitEligible).map((p) => p.brand));
  const outcomes = getOutcomes();
  return [...brands]
    .map((brand) => {
      const sizing = PRODUCTS.find((p) => p.brand === brand)?.brandSizing;
      return computeBrandFitHistory(brand, sizing, outcomes);
    })
    .sort((a, b) => a.appliedEase - b.appliedEase);
}

/** Test-only: forces the review corpus to be re-read. */
export function __resetBrandHistoryCache(): void {
  reviewSignalCache = undefined;
}
