/* =========================================================================
   Whether the "what to try" strip is showing.

   A tiny observable flag rather than context: the strip is rendered once in
   the app shell and toggled from the footer and from /demo, and neither of
   those is worth another provider.
   ========================================================================= */

const STORAGE_KEY = 'nykaafit.tour.v1';

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: boolean | undefined;

function read(): boolean {
  try {
    // Shown by default — an evaluator should not have to find it.
    return window.localStorage.getItem(STORAGE_KEY) !== 'dismissed';
  } catch {
    return true;
  }
}

export function isTourVisible(): boolean {
  if (cache === undefined) cache = read();
  return cache;
}

export function setTourVisible(visible: boolean): void {
  cache = visible;
  try {
    if (visible) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, 'dismissed');
  } catch {
    /* In-memory only for this session. */
  }
  listeners.forEach((l) => l());
}

export function subscribeTour(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
