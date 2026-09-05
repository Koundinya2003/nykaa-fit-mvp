import type { WishlistEntry } from '@/types';
import { PRODUCTS } from '@/data/products';
import { isFitEligible } from './eligibility';
import { track } from '../analytics/fitAnalytics';

/* =========================================================================
   Quick start.

   This replaces an earlier "/demo" route that wrote a fabricated body into
   the shopper's profile and replaced her wishlist with ten backdated saves.
   That was indefensible on two counts: it invented her measurements, and it
   destroyed items she had actually saved.

   What is left is the part that was legitimate. Saving a spread of real
   catalogue products so there is something to resolve is a genuine
   convenience, and it stays honest because:

     - the products are real catalogue items, not invented ones
     - they are saved NOW, so every "saved today" is literally true
     - anything already on the wishlist is kept, not overwritten
     - the profile is never touched. She still enters her own measurements,
       because nobody else can know them.

   The result is a wishlist worth resolving and a body that is hers.
   ========================================================================= */

/** A spread across brands, so the cross-brand comparison has something to
 *  say. Chosen for variety of cut and published chart, not to flatter the
 *  engine — two of these sit outside the category the feature covers, and
 *  should land in "we can't recommend a size yet". */
const QUICK_START_IDS = [
  'wd-009', // Kazo — slim block
  'wd-002', // Vero Moda — bodycon, European sizing
  'wd-001', // Libas — roomier ethnic cut
  'wd-003', // AND — cuts close to its chart
  'wd-010', // W for Woman — generous ease
  'wd-005', // ONLY — tighter grade between sizes
  'wt-007', // Forever New camisole — outside the category
  'wj-003', // ONLY jeans — outside the category
];

export const QUICK_START_COUNT = QUICK_START_IDS.length;

export const QUICK_START_BRAND_COUNT = new Set(
  QUICK_START_IDS.map((id) => PRODUCTS.find((p) => p.id === id)?.brand).filter(Boolean),
).size;

export const QUICK_START_SIZEABLE_COUNT = QUICK_START_IDS.filter((id) => {
  const product = PRODUCTS.find((p) => p.id === id);
  return product ? isFitEligible(product) : false;
}).length;

/**
 * Merges the sample products into whatever is already saved.
 *
 * Returns the new wishlist for the caller to commit, and the ids that were
 * actually added, so the UI can report honestly on what changed.
 */
export function addQuickStartItems(
  existing: WishlistEntry[],
  now = Date.now(),
): { wishlist: WishlistEntry[]; added: string[] } {
  const have = new Set(existing.map((e) => e.productId));
  const added = QUICK_START_IDS.filter((id) => !have.has(id));

  const wishlist = [
    ...existing,
    // Saved now, because that is when they were saved. Backdating these was
    // how the previous build faked a month of shopping history.
    ...added.map((productId) => ({ productId, addedAt: now })),
  ];

  added.forEach((productId) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    track('wishlist_item_saved', {
      product_id: productId,
      brand: product?.brand,
      category: product?.subcategory,
      reason: 'quick_start',
    });
  });

  return { wishlist, added };
}
