import type { BodyMeasurements, FitClass } from '@/types';

/* =========================================================================
   Nykaa Fit domain types.

   One rule governs this whole feature: a recommendation may be built from
   the shopper's own stated measurements and the brand's published size
   chart, and from nothing else. No estimated bodies, no inferred girths,
   no aggregated opinions of other shoppers. When those two inputs are not
   enough to answer, the feature says so and shows the size chart.

   Everything below exists to make that rule enforceable and inspectable.
   ========================================================================= */

/** The three girths a size chart is written in. Every one is optional,
 *  because a shopper who only measured her waist should still get whatever
 *  that one number can honestly buy her. */
export type MeasurementKey = keyof BodyMeasurements;

export const MEASUREMENT_KEYS: MeasurementKey[] = ['bust', 'waist', 'hip'];

export const MEASUREMENT_LABEL: Record<MeasurementKey, string> = {
  bust: 'Bust',
  waist: 'Waist',
  hip: 'Hip',
};

/** How to take each one. Shown next to the field, because "measure your
 *  waist" is not instructions. */
export const MEASUREMENT_HOWTO: Record<MeasurementKey, string> = {
  bust: 'Around the fullest part, tape level under the arms',
  waist: 'Around the narrowest part, usually just above the navel',
  hip: 'Around the fullest part, roughly 20 cm below the waist',
};

/** A partial body: only what the shopper actually told us, in inches. */
export type PartialMeasurements = Partial<Record<MeasurementKey, number>>;

export type PreferredFit = 'slim' | 'regular' | 'relaxed';

/**
 * The shopper's fit profile.
 *
 * Deliberately small and entirely self-reported. There is no gender field
 * and no body-shape field: neither changes how a tape measure reads, and
 * both were only ever there to feed an estimator this feature no longer has.
 */
export interface FitProfile {
  /** Only the measurements the shopper chose to give. */
  measurements: PartialMeasurements;
  /** How they like clothes to sit. The one preference that changes the answer. */
  preferredFit: PreferredFit;
  /** Optional context, never used to infer a measurement. */
  heightCm?: number;
  createdAt: number;
  updatedAt: number;
}

/** Draft state while the form is open; every field may be empty. */
export interface FitProfileDraft {
  bust: string;
  waist: string;
  hip: string;
  heightCm: string;
  preferredFit: PreferredFit;
}

export type FieldErrors = Partial<Record<keyof FitProfileDraft, string>>;

/* ---------- Per-size assessment ---------- */

/** How a single measurement of a single size lands on this body. */
export type MeasurementVerdict = 'Tight' | 'Snug' | 'Comfortable' | 'Relaxed' | 'Loose';

/** Overall character of a size on this body. */
export type SizeCharacter = 'Too tight' | 'Snug' | 'Regular' | 'Relaxed' | 'Loose';

/** One row of the comparison: what this size's chart says, what the shopper
 *  measured, and the gap between them. */
export interface MeasurementComparison {
  key: MeasurementKey;
  /** What the shopper told us, in inches. Null when they skipped it. */
  yours: number | null;
  /** What this brand's chart says this size is cut for. */
  chart: number;
  /** The room this size leaves you, after the ease you asked for.
   *  Null when the shopper skipped this measurement. */
  ease: number | null;
  verdict: MeasurementVerdict | null;
}

export interface SizeAssessment {
  size: string;
  available: boolean;
  /** Weighted distance in inches, over the measurements the shopper gave.
   *  Lower is better. */
  distance: number;
  character: SizeCharacter;
  comparisons: MeasurementComparison[];
}

/* ---------- Confidence ---------- */

/**
 * What the shopper is told about the strength of the match.
 *
 * Qualitative on purpose: nothing here has been validated against real
 * purchases, so a percentage would imply a calibration this does not have.
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceBreakdown {
  /** 0-1 composite. A ranking artefact, not a probability of being right. */
  score: number;
  level: ConfidenceLevel;
  /** True when the level is too low to name a size at all. */
  withheld: boolean;
  components: {
    /** How much of the shopper's body we actually know. */
    completeness: number;
    /** How well the winning size fits those measurements. */
    closeness: number;
    /** How clearly the winning size beats the runner-up. */
    separation: number;
  };
  /** One sentence naming what is holding the answer back, and what would
   *  fix it. Null when nothing is. */
  limitingFactor: string | null;
  /** The specific measurements that would most improve this answer. */
  missing: MeasurementKey[];
}

/* ---------- Advice ---------- */

/**
 * Something the shopper should weigh, shown beside the recommendation
 * rather than folded silently into it.
 *
 * This is the honest home for "this brand runs small". Those claims are
 * editorial or anecdotal, so they are surfaced as context the shopper can
 * judge — never as an invisible adjustment to the number.
 */
export interface FitNote {
  id: string;
  /** Where the claim comes from, stated plainly. */
  source: 'brand' | 'you';
  label: string;
  body: string;
  /** Which way it points, when it points anywhere. */
  direction: 'up' | 'down' | null;
}

/** An optional nudge when the shopper sits near a size boundary. */
export type SizingHint = 'Consider sizing up' | 'Consider sizing down';

/* ---------- The receipt ---------- */

/**
 * Exactly what went into the answer, and — just as important — what did
 * not. Rendered verbatim in the UI, so the explanation cannot drift away
 * from the computation.
 */
export interface FitReceipt {
  /** The shopper's own inputs that were used. */
  inputsUsed: { label: string; value: string }[];
  /** Inputs that were asked for and not given. */
  inputsMissing: { label: string; value: string }[];
  /** The product-side facts that were used. */
  productFacts: { label: string; value: string }[];
  /** The ease target, in inches, and where it came from. */
  easeTarget: { total: number; parts: { label: string; inches: number }[] };
  /** Things deliberately excluded, named so the exclusion is checkable. */
  notUsed: string[];
}

export interface FitRecommendation {
  productId: string;
  /** The size the engine picks if everything is in stock. */
  idealSize: string;
  /** The size to actually buy — equals `idealSize` unless it is sold out.
   *  Still populated when `confidence.withheld` is true so the reasoning
   *  stays inspectable; the UI must not show it in that case. */
  recommendedSize: string;
  substitution: { unavailableSize: string; reason: string } | null;
  confidence: ConfidenceBreakdown;
  sizingHint: SizingHint | null;
  /** True when two adjacent sizes are effectively tied. */
  betweenSizes: boolean;
  summary: string;
  assessments: SizeAssessment[];
  receipt: FitReceipt;
  /** Advice to weigh, never applied silently. */
  notes: FitNote[];
  /** The measurements the shopper gave, echoed back. */
  body: PartialMeasurements;
  /** Ease the shopper asked for, in inches, from cut + preference. */
  easeTarget: number;
  productFitClass: FitClass;
}

/** Everything the engine needs about the garment. A plain input type so the
 *  engine can be unit-tested without constructing a full Product. */
export interface FitProductInput {
  id: string;
  brand: string;
  sizes: string[];
  soldOutSizes: string[];
  /** The brand's published chart: size label -> the body it is cut for. */
  sizeChart: Record<string, BodyMeasurements>;
  fitClass: FitClass;
  /** The brand's own published sizing note, shown as advice. */
  brandSizing?: { label: string; note: string };
}
