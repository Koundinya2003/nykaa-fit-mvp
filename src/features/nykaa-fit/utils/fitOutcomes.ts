/* =========================================================================
   Post-purchase outcome capture.

   The one thing a size recommender cannot learn from browsing behaviour is
   whether the garment actually fit. A shopper who buys an M and keeps it,
   and a shopper who buys an M and sends it back because it was tight, look
   identical in the funnel — and only the second one tells us the brand runs
   small.

   So after an order is placed we ask, once, per line: did you keep it, and
   if not, why. Those answers are stored on this device and shown back to
   the shopper as advice on that brand (see utils/personalFitNotes.ts).

   They deliberately do NOT move the recommended size. One or two returns is
   a real signal to a person and a hopeless statistic, and quietly shifting
   a number computed from a published chart on that basis is exactly the
   sort of invisible adjustment this feature does without.

   Nothing here leaves the browser. In a production build this is the event
   that would be joined to the order in the warehouse.
   ========================================================================= */

export type FitOutcome = 'kept' | 'returned';

/** Why the garment came back. Only the two size reasons carry a direction;
 *  the others are recorded but excluded from the ease estimate, because a
 *  return for colour says nothing about sizing. */
export type ReturnReason = 'too-small' | 'too-large' | 'style' | 'quality';

export interface OutcomeRecord {
  id: string;
  orderId: string;
  productId: string;
  brand: string;
  size: string;
  outcome: FitOutcome;
  /** Present only when outcome === 'returned'. */
  reason?: ReturnReason;
  /** The size Nykaa Fit had recommended, when it had one. Lets a later
   *  analysis separate "our size was wrong" from "they ignored us". */
  recommendedSize?: string | null;
  ts: number;
}

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  'too-small': 'Too small',
  'too-large': 'Too large',
  style: "Didn't like the style",
  quality: 'Quality or fabric',
};

const STORAGE_KEY = 'nykaafit.outcomes.v1';
const MAX_RECORDS = 400;

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: OutcomeRecord[] | undefined;

function read(): OutcomeRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as OutcomeRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getOutcomes(): OutcomeRecord[] {
  if (cache === undefined) cache = read();
  return cache;
}

export function recordOutcome(input: Omit<OutcomeRecord, 'id' | 'ts'>): OutcomeRecord {
  const record: OutcomeRecord = {
    ...input,
    id: `o_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
  };
  cache = [...getOutcomes(), record].slice(-MAX_RECORDS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* Private mode — the record still counts for this session. */
  }
  emit();
  return record;
}

export function clearOutcomes(): void {
  cache = [];
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to do. */
  }
  emit();
}

export function subscribeOutcomes(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((l) => l());
}

/** Test-only: drops the in-memory cache so the next read hits storage. */
export function __resetOutcomeCache(): void {
  cache = undefined;
}
