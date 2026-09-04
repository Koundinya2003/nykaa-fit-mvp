import type { BodyMeasurements, FitClass } from '@/types';

/* =========================================================================
   Nykaa Fit domain types.
   ========================================================================= */

/** What the shopper tells us. Deliberately short: four required answers.
 *  No photographs, no scanning, no free text. */
export type FitGender = 'female' | 'male' | 'unspecified';

export type PreferredFit = 'slim' | 'regular' | 'relaxed';

export type BodyShape = 'hourglass' | 'pear' | 'apple' | 'rectangle' | 'athletic';

export interface FitProfile {
  heightCm: number;
  weightKg: number;
  gender: FitGender;
  preferredFit: PreferredFit;
  /** Optional — nudges the waist estimate slightly. */
  age?: number;
  /** Optional — redistributes the waist/hip estimate. */
  bodyShape?: BodyShape;
  createdAt: number;
  updatedAt: number;
}

/** Draft state while the form is open; every field may be empty. */
export interface FitProfileDraft {
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

export interface FitRecommendation {
  productId: string;
  /** The size the engine would pick if everything were in stock. */
  idealSize: string;
  /** The size the shopper should actually buy — equals `idealSize` unless it
   *  is sold out. */
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
  /** Optional nudge when the shopper sits near a size boundary. */
  sizingHint: SizingHint | null;
  /** True when two adjacent sizes score almost identically. */
  betweenSizes: boolean;
  summary: string;
  /** Per-size detail powering the comparison table. */
  assessments: SizeAssessment[];
  /** Structured explanation for the "why we recommend" panel. */
  explanation: FitExplanation;
  /** Estimated body, in inches, before any garment adjustment. */
  estimatedBody: BodyMeasurements;
  /** Body after fit-class, preference and brand adjustments. */
  effectiveBody: BodyMeasurements;
  productFitClass: FitClass;
  /** Short positive statements shown as ticks on the result screen. */
  highlights: string[];
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
