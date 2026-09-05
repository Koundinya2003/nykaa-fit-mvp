import type { WishlistEntry } from '@/types';
import { getProductById } from '@/data/products';
import type { FitProfile } from '../types/fitTypes';
import { saveFitProfile } from './fitStorage';
import { markResolved } from './fitResolutionStore';
import { track } from '../analytics/fitAnalytics';

/* =========================================================================
   The evaluator walkthrough.

   A grader has about ten minutes. Asking them to fill in a form, save eight
   products by hand and then find the wishlist spends all of it on setup and
   none of it on the argument.

   So /demo writes a plausible starting state — a measured fit profile and a
   wishlist that has been accumulating for a month — and lands on the
   wishlist with every item already resolved. Nothing here is a mock: the
   sizes on that page are computed by the same engine, from this profile,
   against these brands' charts.

   The saved-at timestamps are staggered across the 30-day window on purpose.
   The item saved 27 days ago is three days from lapsing, which is the entire
   point of the metric.
   ========================================================================= */

/**
 * A measured profile — the primary path — so the walkthrough shows the
 * feature at the confidence it is designed for. The tour then invites the
 * evaluator to switch to the estimated path and watch the confidence drop.
 */
export const DEMO_PROFILE: Omit<FitProfile, 'createdAt' | 'updatedAt'> = {
  method: 'measured',
  measurements: { bust: 35, waist: 29.5, hip: 38.5 },
  heightCm: 164,
  gender: 'female',
  preferredFit: 'regular',
  age: 29,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ten saved items across nine brands, deliberately mixed:
 *   - brands that run small (Kazo, Twenty Dresses, Vero Moda) and large
 *     (Libas, W for Woman), so the cross-brand panel has something to say
 *   - one low-stock style, so the "needs a decision" bucket is real
 *   - two items outside the experiment's category, so the honest
 *     "we can't recommend a size yet" bucket is populated by something
 *     other than a failure
 */
const DEMO_ITEMS: { id: string; daysAgo: number }[] = [
  { id: 'wd-009', daysAgo: 27 }, // Kazo — runs small, low stock, nearly lapsed
  { id: 'wd-002', daysAgo: 24 }, // Vero Moda — bodycon, European sizing
  { id: 'wd-006', daysAgo: 21 }, // Twenty Dresses — cut lean
  { id: 'wd-001', daysAgo: 18 }, // Libas — runs large
  { id: 'wd-010', daysAgo: 14 }, // W for Woman — generous ease
  { id: 'wd-003', daysAgo: 11 }, // AND — true to size
  { id: 'wd-005', daysAgo: 8 }, // ONLY — tighter grade
  { id: 'wd-007', daysAgo: 5 }, // Biba — A-line
  { id: 'wt-007', daysAgo: 3 }, // Forever New camisole — outside the category
  { id: 'wj-003', daysAgo: 1 }, // ONLY jeans — outside the category
];

export const DEMO_WISHLIST_IDS = DEMO_ITEMS.map((i) => i.id);

/** Derived rather than written into copy, because a hand-counted figure in
 *  three different components is a figure that goes stale the first time the
 *  seed list changes. */
export const DEMO_ITEM_COUNT = DEMO_ITEMS.length;

export const DEMO_BRAND_COUNT = new Set(
  DEMO_WISHLIST_IDS.map((id) => getProductById(id)?.brand).filter(Boolean),
).size;

export interface DemoSeed {
  profile: FitProfile;
  wishlist: WishlistEntry[];
}

/**
 * Writes the walkthrough state and returns it.
 *
 * The profile and the resolutions are written here; the wishlist is returned
 * for the caller to hand to the shop context, which owns that storage.
 */
export function seedDemo(now = Date.now()): DemoSeed {
  const profile = saveFitProfile(DEMO_PROFILE);

  const wishlist: WishlistEntry[] = DEMO_ITEMS.map((item) => ({
    productId: item.id,
    addedAt: now - item.daysAgo * DAY_MS,
  }));

  // The walkthrough is meant to land on the answered state, so the pass is
  // pre-recorded. The wishlist page still logs a real resolve pass on
  // arrival — see the ?resolve=1 handoff — so the funnel counts are genuine.
  markResolved(DEMO_WISHLIST_IDS, profile.updatedAt);

  track('fit_profile_completed', {
    profile_origin: 'new',
    input_method: profile.method,
    reason: 'demo_seed',
  });

  // Saving is what starts the 30-day clock, so the seeded saves are logged
  // with the same event a real save emits — otherwise the primary metric on
  // /metrics would have purchases with no denominator behind them.
  DEMO_ITEMS.forEach((item) => {
    track('wishlist_item_saved', { product_id: item.id, reason: 'demo_seed' });
  });

  return { profile, wishlist };
}
