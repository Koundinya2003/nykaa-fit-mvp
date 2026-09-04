import { useSyncExternalStore } from 'react';
import type { FitProfile } from '../types/fitTypes';
import { getFitProfile, subscribeFitProfile } from './fitStorage';

/** Subscribes a component to the saved fit profile. Every surface that reads
 *  the profile stays in sync without another React provider. */
export function useFitProfile(): FitProfile | null {
  return useSyncExternalStore(subscribeFitProfile, getFitProfile, () => null);
}
