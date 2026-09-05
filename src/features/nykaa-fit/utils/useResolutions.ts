import { useSyncExternalStore } from 'react';
import {
  getResolutions,
  subscribeResolutions,
  type ResolutionRecord,
} from './fitResolutionStore';

const EMPTY: Record<string, ResolutionRecord> = {};

export function useResolutions(): Record<string, ResolutionRecord> {
  return useSyncExternalStore(subscribeResolutions, getResolutions, () => EMPTY);
}
