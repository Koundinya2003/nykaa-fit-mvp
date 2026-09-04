import type { BodyMeasurements, Product } from '@/types';
import type {
  FitAdjustment,
  FitExplanation,
  FitProductInput,
  FitProfile,
  FitRecommendation,
  MeasurementVerdict,
  SizeAssessment,
} from '../types/fitTypes';
import { estimateBody } from './bodyModel';
import {
  assessSize,
  effectiveBody,
  matchQualityFor,
  matchScoreFor,
  sizingHintFor,
  FIT_CLASS_ADJUSTMENT,
  PREFERENCE_ADJUSTMENT,
} from './scoring';

/* =========================================================================
   The recommendation engine.

       estimated body
     + product fit class
     + preferred fit
     + brand sizing
     -----------------------------
     = effective body -> nearest size in this brand's chart

   Pure and synchronous: no network, no model, no randomness. The same
   profile and product always produce the same recommendation, which is what
   makes it testable and explainable.
   ========================================================================= */

const FIT_CLASS_LABEL = {
  slim: 'Slim',
  regular: 'Regular',
  relaxed: 'Relaxed',
  oversized: 'Oversized',
} as const;

const PREFERENCE_LABEL = {
  slim: 'Slim',
  regular: 'Regular',
  relaxed: 'Relaxed',
} as const;

/** Two sizes this close are effectively tied for this body. */
const BETWEEN_SIZES_THRESHOLD = 0.15;

/** Canonical apparel run, used to work out which way a hint points. */
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function toFitProductInput(product: Product): FitProductInput | null {
  if (!product.sizeChart) return null;
  return {
    id: product.id,
    brand: product.brand,
    sizes: product.sizes,
    soldOutSizes: product.soldOutSizes,
    sizeChart: product.sizeChart,
    fitClass: product.fitClass,
    brandSizing: product.brandSizing,
  };
}

/** Convenience wrapper for callers holding a full Product. */
export function recommendForProduct(
  profile: FitProfile,
  product: Product,
): FitRecommendation | null {
  const input = toFitProductInput(product);
  return input ? recommendSize(profile, input) : null;
}

export function recommendSize(
  profile: FitProfile,
  product: FitProductInput,
): FitRecommendation | null {
  // Only sizes the product actually offers *and* has a chart entry for.
  const sizes = product.sizes.filter((s) => product.sizeChart[s]);
  if (sizes.length === 0) return null;

  const brandEase = product.brandSizing?.ease ?? 0;
  const body = estimateBody(profile);
  const effective = effectiveBody(body, product.fitClass, profile.preferredFit, brandEase);

  const assessments: SizeAssessment[] = sizes.map((size) =>
    assessSize(
      size,
      product.sizeChart[size],
      effective,
      !product.soldOutSizes.includes(size),
    ),
  );

  const byDistance = [...assessments].sort((a, b) => a.distance - b.distance);
  const ideal = byDistance[0];

  const availableByDistance = byDistance.filter((a) => a.available);
  const chosen = availableByDistance[0] ?? ideal;
  const runnerUp = availableByDistance[1] ?? null;

  const matchScore = matchScoreFor(chosen.distance, runnerUp?.distance ?? null);
  const betweenSizes =
    runnerUp !== null && Math.abs(runnerUp.distance - chosen.distance) < BETWEEN_SIZES_THRESHOLD;

  const substitution = buildSubstitution(ideal, chosen, availableByDistance.length);

  return {
    productId: product.id,
    idealSize: ideal.size,
    recommendedSize: chosen.size,
    substitution,
    matchScore,
    matchQuality: matchQualityFor(chosen.distance, substitution !== null),
    sizingHint: sizingHintFor(chosen, runnerUp, SIZE_ORDER, betweenSizes),
    betweenSizes,
    summary: buildSummary(profile, product, chosen, betweenSizes),
    assessments,
    explanation: buildExplanation(profile, product, chosen),
    estimatedBody: body,
    effectiveBody: roundBody(effective),
    productFitClass: product.fitClass,
    highlights: buildHighlights(profile, chosen),
  };
}

function buildSubstitution(
  ideal: SizeAssessment,
  chosen: SizeAssessment,
  availableCount: number,
): FitRecommendation['substitution'] {
  if (availableCount === 0) {
    return {
      unavailableSize: ideal.size,
      reason: 'Every size in this style is currently out of stock.',
    };
  }
  if (ideal.size === chosen.size) return null;
  return {
    unavailableSize: ideal.size,
    reason: `Your recommended size ${ideal.size} is currently unavailable. ${chosen.size} is the closest available option.`,
  };
}

function buildSummary(
  profile: FitProfile,
  product: FitProductInput,
  chosen: SizeAssessment,
  betweenSizes: boolean,
): string {
  const cut = FIT_CLASS_LABEL[product.fitClass].toLowerCase();
  const pref = PREFERENCE_LABEL[profile.preferredFit].toLowerCase();

  // When the bust and waist read the same, say it once rather than repeating
  // the adjective back at the shopper.
  const body =
    chosen.verdicts.bust === chosen.verdicts.waist
      ? describe(chosen.verdicts.bust, 'bust and waist')
      : `${describe(chosen.verdicts.bust, 'bust')} and ${describe(chosen.verdicts.waist, 'waist')}`;

  const base =
    `Based on your height, weight and preference for a ${pref} fit, ${chosen.size} should be ` +
    `${body} on this ${cut}-cut style.`;

  return betweenSizes
    ? `${base} You sit close to the next size, so either could work depending on how you like to wear it.`
    : base;
}

function describe(verdict: MeasurementVerdict, part: string): string {
  switch (verdict) {
    case 'Tight':
      return `tight across the ${part}`;
    case 'Snug':
      return `close-fitting through the ${part}`;
    case 'Comfortable':
      return `comfortable through the ${part}`;
    case 'Relaxed':
      return `easy through the ${part}`;
    case 'Loose':
      return `loose through the ${part}`;
  }
}

function buildHighlights(profile: FitProfile, chosen: SizeAssessment): string[] {
  const out: string[] = [];

  const bust = chosen.verdicts.bust;
  const waist = chosen.verdicts.waist;
  const hip = chosen.verdicts.hip;

  out.push(
    bust === 'Comfortable'
      ? 'Comfortable through the bust and shoulders'
      : bust === 'Snug'
        ? 'Close, body-skimming fit through the bust'
        : bust === 'Relaxed' || bust === 'Loose'
          ? 'Easy, non-clingy fit through the bust'
          : 'Expect a tight fit across the bust',
  );

  out.push(
    waist === 'Comfortable'
      ? 'Comfortable around the waist'
      : waist === 'Snug'
        ? 'Defined through the waist'
        : waist === 'Relaxed' || waist === 'Loose'
          ? 'Room to spare at the waist'
          : 'Likely to feel restrictive at the waist',
  );

  if (hip === 'Comfortable' || hip === 'Relaxed') {
    out.push('Skims cleanly over the hip');
  }

  out.push(`Matches your preference for a ${PREFERENCE_LABEL[profile.preferredFit].toLowerCase()} fit`);

  return out;
}

/**
 * The explanation is grouped the way the shopper thinks about the decision:
 * what we know about them, what we know about this garment, and which of
 * those actually moved the answer. Directions are phrased in words — nobody
 * should need to understand the scoring to follow it.
 */
function buildExplanation(
  profile: FitProfile,
  product: FitProductInput,
  chosen: SizeAssessment,
): FitExplanation {
  const profileRows = [
    { label: 'Height', value: `${profile.heightCm} cm` },
    { label: 'Weight', value: `${profile.weightKg} kg` },
    { label: 'Preferred fit', value: `${PREFERENCE_LABEL[profile.preferredFit]} fit` },
  ];

  if (profile.bodyShape) {
    profileRows.push({
      label: 'Body shape',
      value: profile.bodyShape[0].toUpperCase() + profile.bodyShape.slice(1),
    });
  }

  const productRows = [
    { label: 'Fit', value: `${FIT_CLASS_LABEL[product.fitClass]} fit` },
    { label: 'Brand sizing', value: product.brandSizing?.label ?? 'True to size' },
  ];

  // Only the factors that actually shifted the answer are listed. A factor
  // contributing zero inches is noise in an explanation.
  const adjustments: FitAdjustment[] = [];

  const preference = PREFERENCE_ADJUSTMENT[profile.preferredFit];
  if (preference !== 0) {
    adjustments.push({
      label: 'Your preferred fit',
      value: `${PREFERENCE_LABEL[profile.preferredFit]}`,
      direction: preference > 0 ? 'up' : 'down',
      contribution: preference,
    });
  }

  const cut = FIT_CLASS_ADJUSTMENT[product.fitClass];
  if (cut !== 0) {
    adjustments.push({
      label: 'Product fit',
      value: FIT_CLASS_LABEL[product.fitClass],
      direction: cut > 0 ? 'up' : 'down',
      contribution: cut,
    });
  }

  const brandEase = product.brandSizing?.ease ?? 0;
  if (brandEase !== 0) {
    adjustments.push({
      label: 'Brand sizing',
      value: product.brandSizing!.label,
      direction: brandEase < 0 ? 'up' : 'down',
      contribution: -brandEase,
    });
  }

  return {
    profile: profileRows,
    product: productRows,
    adjustments,
    comparison: `${chosen.size} is the closest match to this product's measurements for your profile.`,
  };
}

function roundBody(body: BodyMeasurements): BodyMeasurements {
  return {
    bust: Math.round(body.bust * 10) / 10,
    waist: Math.round(body.waist * 10) / 10,
    hip: Math.round(body.hip * 10) / 10,
  };
}
