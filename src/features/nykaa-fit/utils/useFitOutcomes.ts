import { useSyncExternalStore } from 'react';
import { getOutcomes, subscribeOutcomes, type OutcomeRecord } from './fitOutcomes';

const EMPTY: OutcomeRecord[] = [];

/** Subscribes a component to the reported fit outcomes, so any surface
 *  derived from brand fit history re-renders when one is recorded. */
export function useFitOutcomes(): OutcomeRecord[] {
  return useSyncExternalStore(subscribeOutcomes, getOutcomes, () => EMPTY);
}
