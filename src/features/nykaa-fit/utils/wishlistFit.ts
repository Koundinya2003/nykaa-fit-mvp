import type { Product, WishlistEntry } from '@/types';
import type { FitNote, FitProfile, FitRecommendation } from '../types/fitTypes';
import { recommendForProduct } from '../engine/fitEngine';
import { isFitEligible, FIT_ELIGIBLE_CATEGORY_LABEL } from './eligibility';
import { WISHLIST_WINDOW_DAYS } from '../analytics/fitAnalytics';

/* =========================================================================
   Resolving a wishlist.

   A wishlist is a queue of unresolved questions. Price-waiting resolves
   itself — the sale arrives or it doesn't — but fit uncertainty never
   does: nobody wakes up knowing whether the Kazo dress they saved three
   weeks ago runs small.

   So the wishlist's job is to answer that one question for every saved
   item and then sort the list by what the shopper has to DO next:

     ready     size known, in stock, nothing to decide  -> buy it
     decide    we have an answer but there is a catch    -> your call
     blocked   we cannot answer yet                      -> don't guess

   Everything here is pure. The React layer owns when a pass runs; this
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
      'A clear match against this brand’s published chart, in stock right now. Nothing left to work out.',
  },
  {
    id: 'decide',
    title: 'Needs a decision',
    blurb: 'We have an answer, but something is unresolved and it is your call.',
  },
  {
    id: 'blocked',
    title: "We can't recommend a size yet",
    blurb:
      'Below our confidence threshold, missing your measurements, or outside the categories Nykaa Fit covers. We would rather say so than guess.',
  },
];

/** Why an item needs a decision, or why we cannot answer. */
export type WishlistReason =
  | { kind: 'in-stock' }
  | { kind: 'out-of-stock'; size: string }
  | { kind: 'substituted'; wanted: string; offered: string }
  | { kind: 'between-sizes'; size: string; hint: string }
  | { kind: 'not-confirmed'; size: string; why: string }
  | { kind: 'low-confidence'; why: string }
  | { kind: 'ineligible' }
  | { kind: 'no-measurements' }
  | { kind: 'no-profile' };

export interface ResolvedWishlistItem {
  product: Product;
  addedAt: number;
  /** Whole days since it was saved. */
  daysSaved: number;
  /** Days left in the 30-day window; negative once it has lapsed. */
  daysLeftInWindow: number;
  group: WishlistGroupId;
  recommendation: FitRecommendation | null;
  /** The size to show. Null whenever we withhold or cannot compute. */
  size: string | null;
  inStock: boolean;
  reason: WishlistReason;
}

export { WISHLIST_WINDOW_DAYS };

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(ts: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - ts) / DAY_MS));
}

/** "saved 18 days ago" — in days rather than a date, because the window is
 *  what matters. */
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
    case 'not-confirmed':
      return `${reason.size} is in stock, but not confirmed — ${reason.why}`;
    case 'low-confidence':
      return reason.why;
    case 'ineligible':
      return `Nykaa Fit currently covers ${FIT_ELIGIBLE_CATEGORY_LABEL} only`;
    case 'no-measurements':
      return 'Add your measurements and we can size this';
    case 'no-profile':
      return 'Set up a fit profile and we can size this';
  }
}

function lowerFirst(sentence: string): string {
  const secondIsUpper = /[A-Z]/.test(sentence[1] ?? '');
  return secondIsUpper ? sentence : sentence[0].toLowerCase() + sentence.slice(1);
}

/**
 * Runs one item through the recommender and decides which bucket it belongs
 * in. Pure: same profile and product in, same answer out.
 */
export function resolveWishlistItem(
  product: Product,
  entry: WishlistEntry,
  profile: FitProfile | null,
  now = Date.now(),
  personalNotes: FitNote[] = [],
): ResolvedWishlistItem {
  const daysSaved = daysSince(entry.addedAt, now);
  const base = {
    product,
    addedAt: entry.addedAt,
    daysSaved,
    daysLeftInWindow: WISHLIST_WINDOW_DAYS - daysSaved,
  };
  const stocked = product.availability !== 'out-of-stock';

  const blocked = (reason: WishlistReason): ResolvedWishlistItem => ({
    ...base,
    group: 'blocked',
    recommendation: null,
    size: null,
    inStock: stocked,
    reason,
  });

  if (!isFitEligible(product)) return blocked({ kind: 'ineligible' });
  if (!profile) return blocked({ kind: 'no-profile' });
  if (Object.keys(profile.measurements).length === 0) return blocked({ kind: 'no-measurements' });

  const recommendation = recommendForProduct(profile, product, personalNotes);

  if (!recommendation) {
    return blocked({
      kind: 'low-confidence',
      why: 'This product has no size chart on file, so there is nothing to compare against.',
    });
  }

  if (recommendation.confidence.withheld) {
    return {
      ...blocked({
        kind: 'low-confidence',
        why: recommendation.confidence.limitingFactor ?? 'Not enough to go on yet.',
      }),
      recommendation,
    };
  }

  const size = recommendation.recommendedSize;
  const inStock = !product.soldOutSizes.includes(size) && stocked;

  const decide = (reason: WishlistReason, stockedNow = true): ResolvedWishlistItem => ({
    ...base,
    group: 'decide',
    recommendation,
    size,
    inStock: stockedNow,
    reason,
  });

  // Sold out in the size we would have picked: an answer, but not a purchase.
  if (!inStock) return decide({ kind: 'out-of-stock', size }, false);

  if (recommendation.substitution) {
    return decide({
      kind: 'substituted',
      wanted: recommendation.substitution.unavailableSize,
      offered: size,
    });
  }

  // A genuine toss-up between two sizes is a decision, not a confirmation.
  if (recommendation.betweenSizes && recommendation.sizingHint) {
    return decide({ kind: 'between-sizes', size, hint: recommendation.sizingHint });
  }

  // "Confirmed" is a high bar, and it is the bar three measurements exist to
  // clear. Anything short of it is a usable answer, not a settled one — and
  // the row says which of the confidence inputs is short.
  if (recommendation.confidence.level !== 'high') {
    return decide({
      kind: 'not-confirmed',
      size,
      why: lowerFirst(recommendation.confidence.limitingFactor ?? 'we are not fully sure yet.'),
    });
  }

  return { ...base, group: 'ready', recommendation, size, inStock: true, reason: { kind: 'in-stock' } };
}

export interface WishlistResolution {
  items: ResolvedWishlistItem[];
  groups: { meta: WishlistGroupMeta; items: ResolvedWishlistItem[] }[];
  counts: Record<WishlistGroupId, number>;
}

/** Resolves the whole list and buckets it. Within a bucket the oldest saves
 *  come first: they are closest to falling out of the 30-day window. */
export function resolveWishlist(
  entries: { product: Product; entry: WishlistEntry }[],
  profile: FitProfile | null,
  now = Date.now(),
  notesForBrand: (brand: string) => FitNote[] = () => [],
): WishlistResolution {
  const items = entries.map(({ product, entry }) =>
    resolveWishlistItem(product, entry, profile, now, notesForBrand(product.brand)),
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
      items: items.filter((i) => i.group === meta.id).sort((a, b) => a.addedAt - b.addedAt),
    })).filter((g) => g.items.length > 0),
  };
}
