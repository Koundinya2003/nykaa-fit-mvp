import type { Product } from '@/types';
import type {
  ConfidenceBreakdown,
  FitNote,
  FitProductInput,
  FitProfile,
  FitReceipt,
  FitRecommendation,
  PartialMeasurements,
  SizeAssessment,
} from '../types/fitTypes';
import { MEASUREMENT_KEYS, MEASUREMENT_LABEL } from '../types/fitTypes';
import { assessConfidence, listOf } from './confidence';
import {
  assessSize,
  easeTargetFor,
  providedKeys,
  round2,
  sizingHintFor,
  CUT_EASE,
  CUT_EASE_LABEL,
  PREFERENCE_EASE,
  PREFERENCE_LABEL,
} from './scoring';

/* =========================================================================
   The recommendation engine.

       your measurements  (only the ones you gave us)
     + the room you asked for  (this garment's cut + your preferred fit)
     ─────────────────────────────────────────────────────────────────
     = the body to look up  ->  nearest size in THIS BRAND'S published chart
     -> then a confidence check that is allowed to decline

   Two inputs. That is the whole model, and it is the whole model on
   purpose: those are the only two things we actually know. Nothing about
   other shoppers, no estimated girths, no aggregated review sentiment.

   The brand's own "runs small" note and any outcomes the shopper has
   reported herself are returned as `notes` — advice shown beside the answer
   for her to weigh, never an invisible adjustment to it. If a factor can
   change the number, it appears on the receipt in inches.

   Pure and synchronous. The same profile and product always produce the
   same recommendation, which is what makes it testable and explainable.
   ========================================================================= */

/** Two sizes this close are effectively tied for this body. */
const BETWEEN_SIZES_THRESHOLD = 0.15;

/** Canonical apparel run, used to work out which way a hint points. */
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

/** Things this engine deliberately does not consult. Rendered verbatim on
 *  the receipt so the exclusion is checkable rather than claimed. */
const NOT_USED = [
  'Other shoppers’ reviews or ratings',
  'Any estimate of your body from height or weight',
  'Purchase history, browsing history or anything from another site',
];

export function toFitProductInput(product: Product): FitProductInput | null {
  if (!product.sizeChart) return null;
  return {
    id: product.id,
    brand: product.brand,
    sizes: product.sizes,
    soldOutSizes: product.soldOutSizes,
    sizeChart: product.sizeChart,
    fitClass: product.fitClass,
    brandSizing: product.brandSizing
      ? { label: product.brandSizing.label, note: product.brandSizing.note }
      : undefined,
  };
}

/** Convenience wrapper for callers holding a full Product. */
export function recommendForProduct(
  profile: FitProfile,
  product: Product,
  personalNotes: FitNote[] = [],
): FitRecommendation | null {
  const input = toFitProductInput(product);
  return input ? recommendSize(profile, input, personalNotes) : null;
}

export function recommendSize(
  profile: FitProfile,
  product: FitProductInput,
  /** Notes derived from this shopper's own reported outcomes. Injected so
   *  the engine stays pure and free of storage. */
  personalNotes: FitNote[] = [],
): FitRecommendation | null {
  // Only sizes the product actually offers *and* has a chart entry for.
  const sizes = product.sizes.filter((s) => product.sizeChart[s]);
  if (sizes.length === 0) return null;

  const body: PartialMeasurements = { ...profile.measurements };
  // With nothing measured there is no comparison to make. The caller shows
  // the size chart instead — see `resolveWishlistItem` and the PDP block.
  if (providedKeys(body).length === 0) return null;

  const easeTarget = easeTargetFor(product.fitClass, profile.preferredFit);

  const assessments: SizeAssessment[] = sizes.map((size) =>
    assessSize(
      size,
      product.sizeChart[size],
      body,
      easeTarget,
      !product.soldOutSizes.includes(size),
    ),
  );

  const byDistance = [...assessments].sort((a, b) => a.distance - b.distance);
  const ideal = byDistance[0];

  const availableByDistance = byDistance.filter((a) => a.available);
  const chosen = availableByDistance[0] ?? ideal;
  const runnerUp = availableByDistance[1] ?? null;

  const betweenSizes =
    runnerUp !== null && Math.abs(runnerUp.distance - chosen.distance) < BETWEEN_SIZES_THRESHOLD;

  const substitution = buildSubstitution(ideal, chosen, availableByDistance.length);

  const confidence = assessConfidence({
    body,
    bestDistance: chosen.distance,
    runnerUpDistance: runnerUp?.distance ?? null,
    substituted: substitution !== null,
  });

  return {
    productId: product.id,
    idealSize: ideal.size,
    recommendedSize: chosen.size,
    substitution,
    confidence,
    sizingHint: sizingHintFor(chosen, runnerUp, SIZE_ORDER, betweenSizes),
    betweenSizes,
    summary: buildSummary(profile, product, chosen, betweenSizes, confidence),
    assessments,
    receipt: buildReceipt(profile, product, body, easeTarget),
    notes: buildNotes(product, personalNotes),
    body,
    easeTarget,
    productFitClass: product.fitClass,
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
  confidence: ConfidenceBreakdown,
): string {
  const cut = CUT_EASE_LABEL[product.fitClass].toLowerCase();

  // A withheld recommendation must not describe a size at all — naming one
  // and then saying we are unsure is the worst of both.
  if (confidence.withheld) {
    return `We are not confident enough to recommend a size on this ${cut}. ${
      confidence.limitingFactor ?? ''
    } Compare your own measurements against ${product.brand}'s size chart below.`.replace(
      /\s+/g,
      ' ',
    );
  }

  const given = providedKeys(chosen.comparisons.reduce(
    (acc, c) => (c.yours === null ? acc : { ...acc, [c.key]: c.yours }),
    {} as PartialMeasurements,
  ));
  const basis = listOf(given.map((k) => MEASUREMENT_LABEL[k].toLowerCase()));
  const pref = profile.preferredFit;

  const described = chosen.comparisons
    .filter((c) => c.verdict !== null)
    .slice(0, 2)
    .map((c) => `${c.verdict!.toLowerCase()} through the ${MEASUREMENT_LABEL[c.key].toLowerCase()}`);

  const base =
    `Based on your ${basis} and a ${pref} fit, ${chosen.size} in this ${cut} ` +
    `should be ${listOf(described)}.`;

  return betweenSizes
    ? `${base} You sit close to the next size, so either could work depending on how you like to wear it.`
    : base;
}

/**
 * The receipt.
 *
 * Built from the same values the computation used, in the same function
 * call, so the explanation cannot drift away from the arithmetic. Every
 * number the shopper sees here is a number that moved the answer.
 */
function buildReceipt(
  profile: FitProfile,
  product: FitProductInput,
  body: PartialMeasurements,
  easeTarget: number,
): FitReceipt {
  const given = providedKeys(body);

  const inputsUsed = given.map((k) => ({
    label: `Your ${MEASUREMENT_LABEL[k].toLowerCase()}`,
    value: `${body[k]}″`,
  }));
  inputsUsed.push({
    label: 'Your preferred fit',
    value: PREFERENCE_LABEL[profile.preferredFit],
  });

  const inputsMissing = MEASUREMENT_KEYS.filter((k) => !given.includes(k)).map((k) => ({
    label: `Your ${MEASUREMENT_LABEL[k].toLowerCase()}`,
    value: 'Not given — not estimated either',
  }));

  const parts = [
    {
      label: CUT_EASE_LABEL[product.fitClass],
      inches: CUT_EASE[product.fitClass],
    },
    {
      label: `${profile.preferredFit[0].toUpperCase()}${profile.preferredFit.slice(1)} fit preference`,
      inches: PREFERENCE_EASE[profile.preferredFit],
    },
  ].filter((p) => p.inches !== 0);

  return {
    inputsUsed,
    inputsMissing,
    productFacts: [
      { label: 'Size chart', value: `${product.brand}'s published chart` },
      { label: 'Sizes charted', value: Object.keys(product.sizeChart).join(', ') },
      { label: 'Cut', value: CUT_EASE_LABEL[product.fitClass] },
    ],
    easeTarget: { total: round2(easeTarget), parts },
    notUsed: NOT_USED,
  };
}

/**
 * Advice, not arithmetic.
 *
 * A brand's "runs small" note is an editorial claim, and a shopper's own
 * past return is a single data point. Both are worth knowing and neither is
 * strong enough to silently move a number computed from a published chart,
 * so both are surfaced here for her to weigh.
 */
function buildNotes(product: FitProductInput, personalNotes: FitNote[]): FitNote[] {
  const notes: FitNote[] = [];

  if (product.brandSizing && product.brandSizing.label !== 'True to size') {
    notes.push({
      id: 'brand-sizing',
      source: 'brand',
      label: `${product.brand} publishes that its garments ${product.brandSizing.label.toLowerCase()}`,
      body: `${product.brandSizing.note} We size from this brand's own chart, so this note is context rather than something we have already applied.`,
      direction: product.brandSizing.label === 'Runs small' ? 'up' : 'down',
    });
  }

  return [...notes, ...personalNotes];
}
