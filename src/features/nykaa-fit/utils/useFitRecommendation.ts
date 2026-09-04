import { useMemo } from 'react';
import type { Product } from '@/types';
import type { FitProfile, FitRecommendation } from '../types/fitTypes';
import { recommendForProduct } from '../engine/fitEngine';
import { useFitEnabled } from '../experiment/useVariant';
import { isFitEligible } from './eligibility';
import { useFitProfile } from './useFitProfile';

export interface FitState {
  /** Experiment bucket allows the feature at all. */
  enabled: boolean;
  /** This product is inside the experiment's category. */
  eligible: boolean;
  profile: FitProfile | null;
  recommendation: FitRecommendation | null;
  /** True when the recommended size can be added to the bag right now. */
  selectable: boolean;
}

/**
 * Single source of truth for Nykaa Fit on a PDP. The page passes the result
 * to both the fit block and the size selector, so the badge on the size chip
 * and the recommendation card can never disagree.
 */
export function useFitRecommendation(product: Product | undefined): FitState {
  const enabled = useFitEnabled();
  const profile = useFitProfile();
  const eligible = product ? isFitEligible(product) : false;

  const recommendation = useMemo(() => {
    if (!enabled || !eligible || !product || !profile) return null;
    return recommendForProduct(profile, product);
  }, [enabled, eligible, product, profile]);

  const selectable = Boolean(
    recommendation &&
      product &&
      !product.soldOutSizes.includes(recommendation.recommendedSize),
  );

  return { enabled, eligible, profile, recommendation, selectable };
}
