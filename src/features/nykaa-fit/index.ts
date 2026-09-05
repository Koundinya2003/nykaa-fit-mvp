/* Public surface of the Nykaa Fit feature. Everything the rest of the app
   needs is re-exported here; nothing else reaches into the folder. */

export { default as FitBlock } from './components/FitBlock';
export { default as WishlistFitCard } from './components/WishlistFitCard';
export { default as ConfidenceChip } from './components/ConfidenceChip';
export { default as FitOutcomePrompt } from './components/FitOutcomePrompt';
export { default as BrandFitHistoryPanel } from './components/BrandFitHistoryPanel';

export { useFitRecommendation, type FitState } from './utils/useFitRecommendation';
export { isFitEligible, FIT_ELIGIBLE_CATEGORY_LABEL } from './utils/eligibility';
export { useFitProfile } from './utils/useFitProfile';
export { useFitOutcomes } from './utils/useFitOutcomes';
export { useResolutions } from './utils/useResolutions';
export {
  saveFitProfile,
  clearFitProfile,
  getFitProfile,
  migrateProfile,
} from './utils/fitStorage';
export {
  isResolved,
  markResolved,
  clearResolutions,
  getResolutions,
} from './utils/fitResolutionStore';
export {
  recordOutcome,
  getOutcomes,
  clearOutcomes,
  RETURN_REASON_LABEL,
  type FitOutcome,
  type OutcomeRecord,
  type ReturnReason,
} from './utils/fitOutcomes';
export {
  resolveWishlist,
  resolveWishlistItem,
  savedAgoLabel,
  reasonLabel,
  daysSince,
  WISHLIST_GROUPS,
  WISHLIST_WINDOW_DAYS,
  type ResolvedWishlistItem,
  type WishlistGroupId,
  type WishlistResolution,
} from './utils/wishlistFit';

export { recommendForProduct, recommendSize } from './engine/fitEngine';
export {
  brandFitHistory,
  allBrandFitHistories,
  type BrandFitHistory,
} from './engine/brandFitHistory';
export {
  assessConfidence,
  CONFIDENCE_LABEL,
  CONFIDENCE_WEIGHTS,
  HIGH_AT,
  WITHHOLD_BELOW,
  INPUT_CONFIDENCE,
} from './engine/confidence';

export {
  track,
  trackOnce,
  getEvents,
  clearEvents,
  subscribeEvents,
  buildFunnel,
  metricCounts,
  wishlistConversion,
  METRIC_SPECS,
  type AnalyticsEvent,
  type FitEventName,
  type FitEventProps,
  type MetricCount,
  type MetricSpec,
} from './analytics/fitAnalytics';

export { applyVariantFromSearch, getVariant, isFitEnabled } from './experiment/variant';
export { useVariant, useFitEnabled } from './experiment/useVariant';
export type {
  ConfidenceBreakdown,
  ConfidenceLevel,
  FitInputMethod,
  FitProfile,
  FitRecommendation,
} from './types/fitTypes';

export { seedDemo, DEMO_PROFILE, DEMO_WISHLIST_IDS } from './utils/demoSeed';
