import type { FitProfile } from '../types/fitTypes';

/* =========================================================================
   Fit profile persistence.

   localStorage only. Body information never leaves the device: there is no
   network call anywhere in this feature, and no third-party sink is wired in.

   Implemented as a tiny observable store so the PDP, the profile summary and
   the internal Fit Lab all read the same value without another React
   provider wrapping the app.
   ========================================================================= */

const STORAGE_KEY = 'nykaafit.fitProfile.v1';

type Listener = () => void;

let cache: FitProfile | null | undefined;
const listeners = new Set<Listener>();

/**
 * Reads and, where needed, migrates.
 *
 * The first build stored height + weight with no `method`. Those profiles are
 * still perfectly usable — they are exactly the estimated path — so they are
 * upgraded in place rather than thrown away and re-asked for. Anything that
 * satisfies neither branch is dropped.
 */
export function migrateProfile(raw: unknown): FitProfile | null {
  const p = raw as Partial<FitProfile> | null;
  if (!p || typeof p.heightCm !== 'number') return null;

  const hasMeasurements =
    p.measurements != null &&
    typeof p.measurements.bust === 'number' &&
    typeof p.measurements.waist === 'number' &&
    typeof p.measurements.hip === 'number';

  if (p.method === 'measured' && hasMeasurements) return p as FitProfile;
  if (typeof p.weightKg !== 'number') return null;

  // Either an explicitly estimated profile, or a pre-`method` record.
  return { ...(p as FitProfile), method: 'estimated' };
}

function read(): FitProfile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrateProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function getFitProfile(): FitProfile | null {
  if (cache === undefined) cache = read();
  return cache;
}

export function saveFitProfile(
  input: Omit<FitProfile, 'createdAt' | 'updatedAt'>,
): FitProfile {
  const existing = getFitProfile();
  const now = Date.now();
  const profile: FitProfile = {
    ...input,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  cache = profile;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* Private mode or quota — the profile still works for this session. */
  }
  emit();
  return profile;
}

export function clearFitProfile(): void {
  cache = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to do. */
  }
  emit();
}

export function subscribeFitProfile(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((l) => l());
}

/** Test-only: drops the in-memory cache so the next read hits storage. */
export function __resetFitProfileCache(): void {
  cache = undefined;
}
