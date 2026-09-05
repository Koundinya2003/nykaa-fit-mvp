import type { Product, WishlistEntry } from '@/types';
import type { FitProfile, FitRecommendation } from '../types/fitTypes';
import { recommendForProduct } from '../engine/fitEngine';
import { isFitEligible, FIT_ELIGIBLE_CATEGORY_LABEL } from './eligibility';
import { WISHLIST_WINDOW_DAYS } from '../analytics/fitAnalytics';

/* =========================================================================
   Resolving a wishlist.

   The business metric is the share of wishlisted items bought within 30 days
   of being saved, and the thesis is that a wishlist is a queue of unresolved
   questions. Price-waiting resolves itself — the sale arrives, or it doesn't.
   Fit uncertainty never resolves on its own. Nobody wakes up knowing whether
   the Kazo dress they saved three weeks ago runs small.

   So the wishlist's job is to answer that question for every saved item in
   one pass, and then sort the list by what the shopper has to DO next:

     ready     size known, in stock, nothing to decide  -> buy it
     decide    we have an answer but there is a catch    -> your call
     blocked   we cannot answer yet                      -> don't guess

   Everything below is pure. The React layer owns when a pass runs; this
   module owns what a pass concludes.
   ========================================================================= */

export type WishlistGroupId = 'ready' | 'decide' | 'blocked';

export interface WishlistGroupMeta {
  id: WishlistGroupId;
  title: string;
  blurb: string;
}

export const WISHLIST_GROUPS: WishlistGroupMeta[] = [
  {
    id: 'ready',
    title: 'Ready to buy — your size is confirmed and in stock',
    blurb:
      'High confidence on your measurements, this brand\'s fit history and current stock. Nothing left to work out.',
  },
  {
    id: 'decide',
    title: 'Needs a decision',
    blurb:
      'We have an answer, but something is unresolved — stock, a size boundary, or a body we had to estimate rather than measure.',
  },
  {
    id: 'blocked',
    title: "We can't recommend a size yet",
    blurb:
      'Below our confidence threshold, or outside the categories Nykaa Fit covers. We would rather say so than guess.',
  },
];

/** Why an item needs a decision, or why we cannot answer. One short line the
 *  shopper can act on. */
export type WishlistReason =
  | { kind: 'in-stock' }
  | { kind: 'out-of-stock'; size: string }
  | { kind: 'substituted'; wanted: string; offered: string }
  | { kind: 'between-sizes'; size: string; hint: string }
  | { kind: 'estimated-only'; size: string }
  | { kind: 'low-confidence'; why: string }
  | { kind: 'ineligible' }
  | { kind: 'no-profile' };

export interface ResolvedWishlistItem {
  product: Product;
  addedAt: number;
  /** Whole days since it was saved. Drives the 30-day window copy. */
  daysSaved: number;
  /** Days left in the 30-day window; negative once it has lapsed. */
  daysLeftInWindow: number;
  group: WishlistGroupId;
  recommendation: FitRecommendation | null;
  /** The size to show. Null whenever we are withholding or cannot compute. */
  size: string | null;
  /** Whether that size can be bought right now. */
  inStock: boolean;
  reason: WishlistReason;
}

export { WISHLIST_WINDOW_DAYS };

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(ts: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - ts) / DAY_MS));
}

/** "saved 18 days ago" — plain, and deliberately in days rather than a date,
 *  because the window is what matters. */
export function savedAgoLabel(days: number): string {
  if (days <= 0) return 'saved today';
  if (days === 1) return 'saved yesterday';
  return `saved ${days} days ago`;
}

export function reasonLabel(reason: WishlistReason): string {
  switch (reason.kind) {
    case 'in-stock':
      return 'In stock in your size';
    case 'out-of-stock':
      return `Size ${reason.size} is out of stock`;
    case 'substituted':
      return `${reason.wanted} is sold out — ${reason.offered} is the closest available`;
    case 'between-sizes':
      return `You sit between sizes here — ${reason.hint.toLowerCase()}`;
    case 'estimated-only':
      return `${reason.size} is in stock, but your measurements are estimated — worth a check against the chart`;
    case 'low-confidence':
      return reason.why;
    case 'ineligible':
      return `Nykaa Fit currently covers ${FIT_ELIGIBLE_CATEGORY_LABEL} only`;
    case 'no-profile':
      return 'Answer four questions and we can size this';
  }
}

/**
 * Runs one item through the recommender and decides which bucket it belongs
 * in. Pure: same profile, product and fit history in, same answer out.
 */
export function resolveWishlistItem(
  product: Product,
  entry: WishlistEntry,
  profile: FitProfile | null,
  now = Date.now(),
): ResolvedWishlistItem {
  const daysSaved = daysSince(entry.addedAt, now);
  const base = {
    product,
    addedAt: entry.addedAt,
    daysSaved,
    daysLeftInWindow: WISHLIST_WINDOW_DAYS - daysSaved,
  };

  if (!isFitEligible(product)) {
    return {
      ...base,
      group: 'blocked',
      recommendation: null,
      size: null,
      inStock: product.availability !== 'out-of-stock',
      reason: { kind: 'ineligible' },
    };
  }

  if (!profile) {
    return {
      ...base,
      group: 'blocked',
      recommendation: null,
      size: null,
      inStock: product.availability !== 'out-of-stock',
      reason: { kind: 'no-profile' },
    };
  }

  const recommendation = recommendForProduct(profile, product);

  if (!recommendation || recommendation.confidence.withheld) {
    return {
      ...base,
      group: 'blocked',
      recommendation,
      size: null,
      inStock: product.availability !== 'out-of-stock',
      reason: {
        kind: 'low-confidence',
        why:
          recommendation?.confidence.limitingFactor ??
          'This product has no size chart on file, so there is nothing to measure against.',
      },
    };
  }

  const size = recommendation.recommendedSize;
  const inStock =
    !product.soldOutSizes.includes(size) && product.availability !== 'out-of-stock';

  // Sold out in the size we would have picked: an answer, but not a purchase.
  if (!inStock) {
    return {
      ...base,
      group: 'decide',
      recommendation,
      size,
      inStock: false,
      reason: { kind: 'out-of-stock', size },
    };
  }

  if (recommendation.substitution) {
    return {
      ...base,
      group: 'decide',
      recommendation,
      size,
      inStock: true,
      reason: {
        kind: 'substituted',
        wanted: recommendation.substitution.unavailableSize,
        offered: size,
      },
    };
  }

  // A genuine toss-up between two sizes is a decision, not a confirmation —
  // even when confidence clears the threshold.
  if (recommendation.betweenSizes && recommendation.sizingHint) {
    return {
      ...base,
      group: 'decide',
      recommendation,
      size,
      inStock: true,
      reason: {
        kind: 'between-sizes',
        size,
        hint: recommendation.sizingHint,
      },
    };
  }

  // "Confirmed" is a high bar, and it is the bar the measured path exists to
  // clear. A size derived from estimated girths is a usable answer, not a
  // confirmed one, so it lands here rather than in "ready to buy" — which is
  // what makes giving us three real measurements worth doing.
  if (recommendation.confidence.level !== 'high') {
    return {
      ...base,
      group: 'decide',
      recommendation,
      size,
      inStock: true,
      reason: { kind: 'estimated-only', size },
    };
  }

  return {
    ...base,
    group: 'ready',
    recommendation,
    size,
    inStock: true,
    reason: { kind: 'in-stock' },
  };
}

export interface WishlistResolution {
  items: ResolvedWishlistItem[];
  groups: { meta: WishlistGroupMeta; items: ResolvedWishlistItem[] }[];
  counts: Record<WishlistGroupId, number>;
}

/** Resolves the whole list and buckets it. Within a bucket, the oldest saves
 *  come first: they are closest to falling out of the 30-day window. */
export function resolveWishlist(
  entries: { product: Product; entry: WishlistEntry }[],
  profile: FitProfile | null,
  now = Date.now(),
): WishlistResolution {
  const items = entries.map(({ product, entry }) =>
    resolveWishlistItem(product, entry, profile, now),
  );

  const counts: Record<WishlistGroupId, number> = { ready: 0, decide: 0, blocked: 0 };
  items.forEach((item) => {
    counts[item.group] += 1;
  });

  return {
    items,
    counts,
    groups: WISHLIST_GROUPS.map((meta) => ({
      meta,
      items: items
        .filter((i) => i.group === meta.id)
        .sort((a, b) => a.addedAt - b.addedAt),
    })).filter((g) => g.items.length > 0),
  };
}
