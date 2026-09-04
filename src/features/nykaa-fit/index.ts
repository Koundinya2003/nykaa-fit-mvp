/* Public surface of the Nykaa Fit feature. Everything the rest of the app
   needs is re-exported here; nothing else reaches into the folder. */

export { default as FitBlock } from './components/FitBlock';
export { useFitRecommendation, type FitState } from './utils/useFitRecommendation';
export { isFitEligible, FIT_ELIGIBLE_CATEGORY_LABEL } from './utils/eligibility';
export { track, trackOnce, type FitEventName, type FitEventProps } from './analytics/fitAnalytics';
export { applyVariantFromSearch, getVariant, isFitEnabled } from './experiment/variant';
export { useVariant, useFitEnabled } from './experiment/useVariant';
export type { FitProfile, FitRecommendation } from './types/fitTypes';
