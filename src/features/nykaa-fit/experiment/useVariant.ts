import { useSyncExternalStore } from 'react';
import { getVariant, subscribeVariant, type Variant } from './variant';

export function useVariant(): Variant {
  return useSyncExternalStore(subscribeVariant, getVariant, () => 'control' as Variant);
}

export function useFitEnabled(): boolean {
  return useVariant() === 'treatment';
}
