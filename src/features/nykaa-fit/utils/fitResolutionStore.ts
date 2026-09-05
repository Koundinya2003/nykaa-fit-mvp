/* =========================================================================
   Which saved items have had their fit question answered.

   "Resolve fit for all saved items" has to be a real action with a real
   result, not a label on something that was already happening — otherwise
   the wishlist_item_resolved event measures nothing and the button is
   decoration.

   So a resolution is recorded per item, stamped with the profile version it
   was computed against. Editing the profile invalidates every stored
   resolution, because the answers are no longer the answers.
   ========================================================================= */

export interface ResolutionRecord {
  /** `profile.updatedAt` at the moment the pass ran. */
  profileVersion: number;
  resolvedAt: number;
}

const STORAGE_KEY = 'nykaafit.resolutions.v1';

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Record<string, ResolutionRecord> | undefined;

function read(): Record<string, ResolutionRecord> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getResolutions(): Record<string, ResolutionRecord> {
  if (cache === undefined) cache = read();
  return cache;
}

/** True when this item has been resolved against the current profile. */
export function isResolved(productId: string, profileVersion: number): boolean {
  const record = getResolutions()[productId];
  return record !== undefined && record.profileVersion === profileVersion;
}

export function markResolved(productIds: string[], profileVersion: number): void {
  const now = Date.now();
  const next = { ...getResolutions() };
  productIds.forEach((id) => {
    next[id] = { profileVersion, resolvedAt: now };
  });
  write(next);
}

export function clearResolutions(): void {
  write({});
}

function write(next: Record<string, ResolutionRecord>): void {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* Private mode — resolutions hold for this session only. */
  }
  listeners.forEach((l) => l());
}

export function subscribeResolutions(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only. */
export function __resetResolutionCache(): void {
  cache = undefined;
}
