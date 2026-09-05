/* Public surface of the Nykaa Fit feature. Everything the rest of the app
   needs is re-exported here; nothing else reaches into the folder. */

export { default as FitBlock } from './components/FitBlock';
export { default as FitProfileForm } from './components/FitProfileForm';
export { default as WishlistFitCard } from './components/WishlistFitCard';
export { default as ConfidenceChip } from './components/ConfidenceChip';
export { default as FitOutcomePrompt } from './components/FitOutcomePrompt';
export { default as FitReceiptPanel } from './components/FitReceiptPanel';
export { default as FitNotes } from './components/FitNotes';

export { useFitRecommendation, type FitState } from './utils/useFitRecommendation';
export { isFitEligible, FIT_ELIGIBLE_CATEGORY_LABEL } from './utils/eligibility';
export { useFitProfile } from './utils/useFitProfile';
export { useFitOutcomes } from './utils/useFitOutcomes';
export { useResolutions } from './utils/useResolutions';
export {
  saveFitProfile,
  clearFitProfile,
  getFitProfile,
  hasMeasurements,
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
export { personalNotesFor } from './utils/personalFitNotes';
export {
  addQuickStartItems,
  QUICK_START_COUNT,
  QUICK_START_BRAND_COUNT,
  QUICK_START_SIZEABLE_COUNT,
} from './utils/quickStart';
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
  assessConfidence,
  CONFIDENCE_LABEL,
  CONFIDENCE_WEIGHTS,
  HIGH_AT,
  WITHHOLD_BELOW,
} from './engine/confidence';
export {
  easeTargetFor,
  providedKeys,
  CUT_EASE,
  CUT_EASE_LABEL,
  PREFERENCE_EASE,
  PREFERENCE_LABEL,
} from './engine/scoring';

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

export {
  MEASUREMENT_KEYS,
  MEASUREMENT_LABEL,
  MEASUREMENT_HOWTO,
  type ConfidenceBreakdown,
  type ConfidenceLevel,
  type FitNote as FitNoteType,
  type FitProfile,
  type FitRecommendation,
  type MeasurementKey,
  type PartialMeasurements,
  type PreferredFit,
} from './types/fitTypes';
