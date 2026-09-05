import type { FitProfile, PartialMeasurements, PreferredFit } from '../types/fitTypes';
import { MEASUREMENT_KEYS } from '../types/fitTypes';

/* =========================================================================
   Fit profile persistence.

   localStorage only. The profile never leaves the device: there is no
   network call anywhere in this feature, and no third-party sink is wired
   in. The privacy copy in the UI says exactly this, and it is true because
   there is no code here that could make it false.

   Implemented as a tiny observable store so the profile page, the PDP and
   the wishlist all read the same value and re-render together, without
   another React provider wrapping the app.
   ========================================================================= */

const STORAGE_KEY = 'nykaafit.fitProfile.v2';
/** The pre-measurement shape, read once so early profiles are not lost. */
const LEGACY_KEY = 'nykaafit.fitProfile.v1';

type Listener = () => void;

let cache: FitProfile | null | undefined;
const listeners = new Set<Listener>();

const PREFERENCES: PreferredFit[] = ['slim', 'regular', 'relaxed'];

function cleanMeasurements(raw: unknown): PartialMeasurements {
  const out: PartialMeasurements = {};
  if (!raw || typeof raw !== 'object') return out;
  const source = raw as Record<string, unknown>;
  MEASUREMENT_KEYS.forEach((key) => {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) out[key] = value;
  });
  return out;
}

/**
 * Reads whatever is on disk into the current shape.
 *
 * An earlier build stored height and weight and estimated the girths from
 * them. Those estimates are exactly what this feature no longer does, so
 * they are NOT carried forward as if the shopper had measured herself —
 * only her stated fit preference survives, and she is asked for the
 * measurements. Silently promoting a guess to a measurement would be the
 * one migration that undermines the whole change.
 */
export function migrateProfile(raw: unknown): FitProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;

  const measurements = cleanMeasurements(p.measurements);
  const preferredFit = PREFERENCES.includes(p.preferredFit as PreferredFit)
    ? (p.preferredFit as PreferredFit)
    : 'regular';

  const heightCm =
    typeof p.heightCm === 'number' && Number.isFinite(p.heightCm) ? p.heightCm : undefined;

  // Nothing usable at all.
  if (Object.keys(measurements).length === 0 && p.preferredFit === undefined) return null;

  const now = Date.now();
  return {
    measurements,
    preferredFit,
    heightCm,
    createdAt: typeof p.createdAt === 'number' ? p.createdAt : now,
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : now,
  };
}

function read(): FitProfile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateProfile(JSON.parse(raw));

    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) return null;
    const migrated = migrateProfile(JSON.parse(legacy));
    // Persist the migration so the legacy record is only interpreted once.
    if (migrated) write(migrated);
    return migrated;
  } catch {
    return null;
  }
}

function write(profile: FitProfile): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* Private mode or quota — the profile still works for this session. */
  }
}

export function getFitProfile(): FitProfile | null {
  if (cache === undefined) cache = read();
  return cache;
}

/** True when there is enough to compare against a chart. */
export function hasMeasurements(profile: FitProfile | null): boolean {
  return profile !== null && Object.keys(profile.measurements).length > 0;
}

export function saveFitProfile(input: Omit<FitProfile, 'createdAt' | 'updatedAt'>): FitProfile {
  const existing = getFitProfile();
  const now = Date.now();
  const profile: FitProfile = {
    ...input,
    measurements: cleanMeasurements(input.measurements),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  cache = profile;
  write(profile);
  emit();
  return profile;
}

export function clearFitProfile(): void {
  cache = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
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
