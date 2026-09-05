import type { FitNote } from '../types/fitTypes';
import type { OutcomeRecord } from './fitOutcomes';

/* =========================================================================
   The shopper's own fit history, turned into advice.

   This is the only "history" the feature has, and it is entirely
   first-party: outcomes she reported herself after an order. There is no
   crowd here, no aggregation over other people's reviews, and nothing
   inferred about her from anyone else's behaviour.

   Note what these do NOT do: they never move the recommended size. One or
   two returns is a real signal to a person and a terrible statistic — the
   right treatment is to put it in front of her next to the answer and let
   her decide, not to silently shift a number computed from a published
   chart. If she buys the same brand ten times and it runs small every
   time, that is a product decision to revisit with actual data, not a
   coefficient to invent now.
   ========================================================================= */

const REASON_DIRECTION: Record<string, 'up' | 'down'> = {
  'too-small': 'up',
  'too-large': 'down',
};

/**
 * Advice for this brand, built from this shopper's reported outcomes.
 *
 * Returns an empty array when she has reported nothing for the brand, which
 * is the common case and should read as silence rather than as a hedge.
 */
export function personalNotesFor(brand: string, outcomes: OutcomeRecord[]): FitNote[] {
  const mine = outcomes.filter((o) => o.brand === brand);
  if (mine.length === 0) return [];

  const sizeReturns = mine.filter(
    (o) => o.outcome === 'returned' && o.reason && REASON_DIRECTION[o.reason],
  );
  const kept = mine.filter((o) => o.outcome === 'kept');

  const notes: FitNote[] = [];

  if (sizeReturns.length > 0) {
    // Group by direction so "one came back small, one came back large" reads
    // as the genuinely unhelpful signal it is, rather than as a verdict.
    const up = sizeReturns.filter((o) => REASON_DIRECTION[o.reason!] === 'up');
    const down = sizeReturns.filter((o) => REASON_DIRECTION[o.reason!] === 'down');

    if (up.length > 0 && down.length > 0) {
      notes.push({
        id: 'you-mixed',
        source: 'you',
        label: `You've sent ${brand} back for both reasons`,
        body: `${up.length} came back too small and ${down.length} too large. That is worth knowing before you order again, but it does not point either way, so we have not adjusted anything.`,
        direction: null,
      });
    } else {
      const dominant = up.length > 0 ? up : down;
      const direction = up.length > 0 ? 'up' : 'down';
      const word = direction === 'up' ? 'too small' : 'too large';
      notes.push({
        id: 'you-returns',
        source: 'you',
        label: `You returned ${dominant.length === 1 ? 'a' : `${dominant.length}`} ${brand} ${dominant.length === 1 ? 'item' : 'items'} as ${word}`,
        body: `Sizes ${listSizes(dominant)}. We have not moved the recommendation on ${dominant.length === 1 ? 'one report' : `${dominant.length} reports`} — it is your call whether to size ${direction}.`,
        direction,
      });
    }
  }

  if (kept.length > 0 && sizeReturns.length === 0) {
    notes.push({
      id: 'you-kept',
      source: 'you',
      label: `You kept ${kept.length === 1 ? 'the last' : `${kept.length}`} ${brand} ${kept.length === 1 ? 'item you bought' : 'items you bought'}`,
      body: `Size${kept.length === 1 ? '' : 's'} ${listSizes(kept)} worked for you, which is a good sign for this brand's chart.`,
      direction: null,
    });
  }

  return notes;
}

function listSizes(records: OutcomeRecord[]): string {
  const sizes = [...new Set(records.map((r) => r.size))];
  if (sizes.length === 1) return sizes[0];
  return `${sizes.slice(0, -1).join(', ')} and ${sizes[sizes.length - 1]}`;
}
