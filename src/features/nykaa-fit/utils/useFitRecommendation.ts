import { useMemo } from 'react';
import type { Product } from '@/types';
import type { FitProfile, FitRecommendation } from '../types/fitTypes';
import { recommendForProduct } from '../engine/fitEngine';
import { useFitEnabled } from '../experiment/useVariant';
import { isFitEligible } from './eligibility';
import { useFitProfile } from './useFitProfile';
import { useFitOutcomes } from './useFitOutcomes';
import { personalNotesFor } from './personalFitNotes';
import { hasMeasurements } from './fitStorage';

export interface FitState {
  /** Experiment bucket allows the feature at all. */
  enabled: boolean;
  /** This product is inside the experiment's category and has a chart. */
  eligible: boolean;
  profile: FitProfile | null;
  /** True when the profile exists but carries no measurements yet — the
   *  state that needs a prompt rather than a recommendation. */
  needsMeasurements: boolean;
  recommendation: FitRecommendation | null;
  /** True when the recommended size can be added to the bag right now. */
  selectable: boolean;
}

/**
 * Single source of truth for Nykaa Fit on a product.
 *
 * The page passes the result to both the fit block and the size selector,
 * so the badge on the size chip and the recommendation card can never
 * disagree. Recomputes whenever the profile changes, which is what makes
 * editing measurements update the answer live.
 */
export function useFitRecommendation(product: Product | undefined): FitState {
  const enabled = useFitEnabled();
  const profile = useFitProfile();
  const outcomes = useFitOutcomes();
  const eligible = product ? isFitEligible(product) : false;

  const recommendation = useMemo(() => {
    if (!enabled || !eligible || !product || !profile) return null;
    if (!hasMeasurements(profile)) return null;
    return recommendForProduct(profile, product, personalNotesFor(product.brand, outcomes));
  }, [enabled, eligible, product, profile, outcomes]);

  const selectable = Boolean(
    recommendation &&
      !recommendation.confidence.withheld &&
      product &&
      !product.soldOutSizes.includes(recommendation.recommendedSize),
  );

  return {
    enabled,
    eligible,
    profile,
    needsMeasurements: profile !== null && !hasMeasurements(profile),
    recommendation,
    selectable,
  };
}
