import { setExperimentGroupResolver } from '../analytics/fitAnalytics';

/* =========================================================================
   Experiment assignment.

   Control    — the existing PDP, unchanged.
   Treatment  — the same PDP plus Nykaa Fit.

   Assignment is a deterministic hash of a persisted randomisation unit, not
   a coin flip. That matters for three reasons a real experiment cares about:

     1. The same visitor always lands in the same arm, on every page and in
        every session, without the arm itself having to be stored.
     2. The same unit id produces the same arm anywhere the hash can be
        reimplemented, so a warehouse job can reproduce the split for
        analysis rather than trusting what the client wrote down.
     3. Changing EXPERIMENT_SALT re-randomises everyone, so a follow-up test
        is not correlated with this one's assignment.

   TREATMENT_ALLOCATION is the only dial a rollout needs:
     0    — everyone in control (feature dark)
     0.5  — a live 50/50 experiment
     1    — everyone in treatment (the development default, so a reviewer
            opening the prototype always sees the feature)

   No results are simulated anywhere. The app only emits the events an
   analysis would consume.
   ========================================================================= */

export type Variant = 'control' | 'treatment';

/** Share of traffic routed to treatment. See the note above. */
export const TREATMENT_ALLOCATION = 1;

/** Bump this to re-randomise assignment for a subsequent experiment. */
export const EXPERIMENT_SALT = 'nykaa-fit-pdp-v1';

const UNIT_KEY = 'nykaafit.unitId.v1';
const OVERRIDE_KEY = 'nykaafit.experimentOverride.v1';

type Listener = () => void;
const listeners = new Set<Listener>();

let cache: Variant | undefined;

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Private mode — assignment holds for this session only. */
  }
}

/**
 * The randomisation unit. A logged-in build would use the customer id here
 * so assignment follows the person across devices; anonymous traffic falls
 * back to a persisted per-browser id, which is what this prototype has.
 */
export function getUnitId(): string {
  const existing = readStored(UNIT_KEY);
  if (existing) return existing;
  const id = `u_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  writeStored(UNIT_KEY, id);
  return id;
}

/** FNV-1a mapped to [0, 1). Cheap, stable, and simple enough to reimplement
 *  in SQL or Python so the warehouse can reproduce the same split. */
export function hashToUnitInterval(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** Pure assignment — exported so it can be tested without touching storage. */
export function assignVariant(unitId: string, allocation: number): Variant {
  if (allocation <= 0) return 'control';
  if (allocation >= 1) return 'treatment';
  return hashToUnitInterval(`${EXPERIMENT_SALT}:${unitId}`) < allocation ? 'treatment' : 'control';
}

function isVariant(value: string | null): value is Variant {
  return value === 'control' || value === 'treatment';
}

export function getVariant(): Variant {
  if (cache) return cache;

  const override = readStored(OVERRIDE_KEY);
  if (isVariant(override)) {
    cache = override;
    return cache;
  }

  cache = assignVariant(getUnitId(), TREATMENT_ALLOCATION);
  return cache;
}

/** Manual override, used by ?fit= and the internal Fit Lab. Overrides are a
 *  QA affordance — a forced session still stamps its group onto every event,
 *  so it remains visible (and excludable) in the data. */
export function setVariantOverride(variant: Variant | null): void {
  try {
    if (variant) window.localStorage.setItem(OVERRIDE_KEY, variant);
    else window.localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* Fall through to in-memory only. */
  }
  cache = variant ?? undefined;
  if (!variant) getVariant();
  listeners.forEach((l) => l());
}

export function hasVariantOverride(): boolean {
  return isVariant(readStored(OVERRIDE_KEY));
}

export function isFitEnabled(): boolean {
  return getVariant() === 'treatment';
}

export function subscribeVariant(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reads ?fit=on|off once at app start and pins the bucket accordingly. */
export function applyVariantFromSearch(search: string): void {
  const value = new URLSearchParams(search).get('fit');
  if (value === 'on') setVariantOverride('treatment');
  else if (value === 'off') setVariantOverride('control');
}

// Stamp every analytics event with the current bucket.
setExperimentGroupResolver(() => getVariant());
