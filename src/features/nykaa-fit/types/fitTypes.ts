import type { BodyMeasurements, FitClass } from '@/types';

/* =========================================================================
   Nykaa Fit domain types.
   ========================================================================= */

/**
 * How the body numbers behind a profile were obtained.
 *
 *  measured  — the shopper gave us bust, waist, hip and height. A measurement
 *              means the same thing in every brand; a size label does not.
 *              This is the primary path.
 *  estimated — the shopper did not have a tape measure, so we derived the
 *              three girths from height, weight and (optionally) body shape.
 *              Usable, but a proxy, and labelled as one everywhere.
 */
export type FitInputMethod = 'measured' | 'estimated';

export type FitGender = 'female' | 'male' | 'unspecified';

export type PreferredFit = 'slim' | 'regular' | 'relaxed';

export type BodyShape = 'hourglass' | 'pear' | 'apple' | 'rectangle' | 'athletic';

/**
 * The saved fit profile.
 *
 * `method` decides which of the two branches is populated. Both branches
 * carry height, because height anchors garment length and proportion on
 * either path; only the estimated branch needs weight and body shape, and
 * only the measured branch carries real girths.
 */
export interface FitProfile {
  method: FitInputMethod;
  heightCm: number;
  /** Present when method === 'measured'. Inches. */
  measurements?: BodyMeasurements;
  /** Present when method === 'estimated'. */
  weightKg?: number;
  /** Optional on the estimated path — redistributes the waist/hip estimate. */
  bodyShape?: BodyShape;
  gender: FitGender;
  preferredFit: PreferredFit;
  /** Optional — nudges the waist estimate slightly. */
  age?: number;
  createdAt: number;
  updatedAt: number;
}

/** Draft state while the form is open; every field may be empty. */
export interface FitProfileDraft {
  method: FitInputMethod;
  bustIn: string;
  waistIn: string;
  hipIn: string;
  heightCm: string;
  weightKg: string;
  gender: FitGender | '';
  preferredFit: PreferredFit | '';
  age: string;
  bodyShape: BodyShape | '';
}

export type FieldErrors = Partial<Record<keyof FitProfileDraft, string>>;

/** How a single measurement of a single size lands on this body. */
export type MeasurementVerdict = 'Tight' | 'Snug' | 'Comfortable' | 'Relaxed' | 'Loose';

/** Overall character of a size on this body — the "Fit" row of the
 *  comparison table. */
export type SizeCharacter = 'Too tight' | 'Snug' | 'Regular' | 'Relaxed' | 'Loose';

/**
 * What the shopper is told about the strength of the match.
 *
 * Deliberately qualitative. We have no empirical validation data, so a
 * percentage would imply a probability of being right that this heuristic
 * cannot support. `Closest available size` is the honest label when nothing
 * in the size run is a good match, or when the best size is out of stock.
 */
export type MatchQuality = 'Strong match' | 'Good match' | 'Closest available size';

/** An optional nudge when the shopper sits near a size boundary. */
export type SizingHint = 'Consider sizing up' | 'Consider sizing down';

export interface SizeAssessment {
  size: string;
  available: boolean;
  /** Weighted distance in inches between the body and the size. Lower is better. */
  distance: number;
  /** 0–100, derived from distance. Presentation only; ranking uses distance. */
  score: number;
  character: SizeCharacter;
  verdicts: Record<keyof BodyMeasurements, MeasurementVerdict>;
  /** Signed inches of room the garment leaves at each measurement. */
  ease: Record<keyof BodyMeasurements, number>;
}

export interface FitFactorRow {
  label: string;
  value: string;
}

/** A factor that actually moved the recommendation, phrased as a direction
 *  rather than a number — the shopper should follow it without knowing the
 *  algorithm. */
export interface FitAdjustment extends FitFactorRow {
  direction: 'up' | 'down';
  /** Signed inches, kept for the Fit Lab and for tests. Not shown as a number. */
  contribution: number;
}

/**
 * The "why we recommend M" panel, structured around the decision the shopper
 * is making: what we know about you, what we know about this product, and how
 * those combined.
 */
export interface FitExplanation {
  profile: FitFactorRow[];
  product: FitFactorRow[];
  adjustments: FitAdjustment[];
  /** One sentence tying the size back to the product's measurements. */
  comparison: string;
}

/* ---------- Confidence ---------- */

/**
 * How much the recommendation should be trusted, and — crucially — whether
 * it should be given at all.
 *
 * Three inputs, all of them things we actually know:
 *   input       how the body numbers were obtained (measured vs estimated)
 *   separation  how clearly the winning size beats the runner-up
 *   brandData   how much fit history this brand has, and how consistent it is
 *
 * Below `WITHHOLD_BELOW` we do not name a size. Guessing on a thin brand for
 * a shopper who sits between two sizes is exactly the case where a wrong
 * answer costs a return, and "we don't know yet, here is the chart" is the
 * honest output.
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceBreakdown {
  /** 0-1 composite. Ranking artefact, not a validated probability. */
  score: number;
  level: ConfidenceLevel;
  /** True when the level is too low to name a size. */
  withheld: boolean;
  /** Each component, 0-1, so the UI and the Fit Lab can show the reason. */
  components: {
    input: number;
    separation: number;
    brandData: number;
    absoluteFit: number;
  };
  /** One sentence naming the weakest component — what would improve it. */
  limitingFactor: string;
  /** True when the estimated-measurement path capped the level. */
  cappedByEstimate: boolean;
}

export interface FitRecommendation {
  productId: string;
  /** The size the engine would pick if everything were in stock. */
  idealSize: string;
  /** The size the shopper should actually buy — equals `idealSize` unless it
   *  is sold out. Still populated when `confidence.withheld` is true, so the
   *  Fit Lab can inspect what we would have said; the UI must not show it. */
  recommendedSize: string;
  /** Set when `idealSize` is unavailable and we fell back. */
  substitution: { unavailableSize: string; reason: string } | null;
  /**
   * Internal algorithmic score, 50–94. This is a ranking artefact of the
   * heuristic, NOT a probability that the recommendation is correct — there
   * is no validation data behind it. It is never shown to shoppers; it exists
   * so the Fit Lab and analytics can compare recommendations to each other.
   */
  matchScore: number;
  /** What the shopper actually sees. */
  matchQuality: MatchQuality;
  /** Whether we are confident enough to name a size at all. */
  confidence: ConfidenceBreakdown;
  /** Optional nudge when the shopper sits near a size boundary. */
  sizingHint: SizingHint | null;
  /** True when two adjacent sizes score almost identically. */
  betweenSizes: boolean;
  summary: string;
  /** Per-size detail powering the comparison table. */
  assessments: SizeAssessment[];
  /** Structured explanation for the "why we recommend" panel. */
  explanation: FitExplanation;
  /** The body the engine reasoned about, in inches — measured or estimated. */
  estimatedBody: BodyMeasurements;
  /** Body after fit-class, preference and brand adjustments. */
  effectiveBody: BodyMeasurements;
  productFitClass: FitClass;
  /** Short positive statements shown as ticks on the result screen. */
  highlights: string[];
  /** The brand-sizing correction actually applied, in inches, after blending
   *  the published label with observed fit history. */
  appliedBrandEase: number;
}

/** Everything the engine needs about the garment. Kept as a plain input type
 *  so the engine can be unit-tested without constructing a full Product. */
export interface FitProductInput {
  id: string;
  brand: string;
  sizes: string[];
  soldOutSizes: string[];
  sizeChart: Record<string, BodyMeasurements>;
  fitClass: FitClass;
  brandSizing?: { label: string; ease: number; note: string };
}
