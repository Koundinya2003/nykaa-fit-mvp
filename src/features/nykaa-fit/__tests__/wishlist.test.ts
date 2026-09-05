import { beforeEach, describe, expect, it } from 'vitest';
import { PRODUCTS, getProductById } from '@/data/products';
import type { Product, WishlistEntry } from '@/types';
import type { FitProfile } from '../types/fitTypes';
import { resolveWishlist, resolveWishlistItem, savedAgoLabel, daysSince } from '../utils/wishlistFit';
import { isFitEligible } from '../utils/eligibility';
import { __resetFitProfileCache, clearFitProfile, migrateProfile } from '../utils/fitStorage';
import {
  __resetResolutionCache,
  clearResolutions,
  isResolved,
  markResolved,
} from '../utils/fitResolutionStore';
import {
  __resetAnalyticsCache,
  clearEvents,
  getEvents,
  metricCounts,
  track,
  wishlistConversion,
} from '../analytics/fitAnalytics';

/* =========================================================================
   The wishlist is the surface the business metric is measured on, so its
   grouping, its clock and its instrumentation all get tested rather than
   eyeballed.
   ========================================================================= */

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 5);

const MEASURED: FitProfile = {
  method: 'measured',
  measurements: { bust: 35, waist: 29.5, hip: 38.5 },
  heightCm: 164,
  gender: 'female',
  preferredFit: 'regular',
  createdAt: 0,
  updatedAt: 1,
};

const dress = (id: string) => getProductById(id)!;

function entry(productId: string, daysAgo: number): WishlistEntry {
  return { productId, addedAt: NOW - daysAgo * DAY };
}

function pairs(items: { id: string; daysAgo: number }[]) {
  return items.map((i) => ({ product: dress(i.id), entry: entry(i.id, i.daysAgo) }));
}

describe('the saved-at clock', () => {
  it('counts whole days since the item was saved', () => {
    expect(daysSince(NOW - 18 * DAY, NOW)).toBe(18);
    expect(daysSince(NOW - 0.5 * DAY, NOW)).toBe(0);
  });

  it('never reports a negative age for a clock skew', () => {
    expect(daysSince(NOW + 5 * DAY, NOW)).toBe(0);
  });

  it('reads as plain English', () => {
    expect(savedAgoLabel(0)).toBe('saved today');
    expect(savedAgoLabel(1)).toBe('saved yesterday');
    expect(savedAgoLabel(18)).toBe('saved 18 days ago');
  });

  it('exposes how much of the 30-day window is left', () => {
    const item = resolveWishlistItem(dress('wd-003'), entry('wd-003', 27), MEASURED, NOW);
    expect(item.daysSaved).toBe(27);
    expect(item.daysLeftInWindow).toBe(3);
  });

  it('reports a lapsed item as past the window rather than clamping to zero', () => {
    const item = resolveWishlistItem(dress('wd-003'), entry('wd-003', 41), MEASURED, NOW);
    expect(item.daysLeftInWindow).toBeLessThan(0);
  });
});

describe('grouping', () => {
  it('reaches "ready to buy" for at least one saved dress', () => {
    // The bucket has to be attainable, or the page has no happy path.
    const resolution = resolveWishlist(
      pairs(PRODUCTS.filter(isFitEligible).map((p) => ({ id: p.id, daysAgo: 4 }))),
      MEASURED,
      NOW,
    );
    expect(resolution.counts.ready).toBeGreaterThan(0);
  });

  it('never puts an item in "ready to buy" without a size that is in stock', () => {
    const resolution = resolveWishlist(
      pairs(PRODUCTS.filter(isFitEligible).map((p) => ({ id: p.id, daysAgo: 3 }))),
      MEASURED,
      NOW,
    );
    resolution.items
      .filter((i) => i.group === 'ready')
      .forEach((item) => {
        expect(item.size, item.product.id).not.toBeNull();
        expect(item.inStock, item.product.id).toBe(true);
        expect(item.product.soldOutSizes, item.product.id).not.toContain(item.size);
        expect(item.recommendation!.confidence.withheld, item.product.id).toBe(false);
      });
  });

  it('blocks items outside the categories Nykaa Fit covers, and says why', () => {
    const jeans = PRODUCTS.find((p) => p.subcategory === 'jeans')! as Product;
    const item = resolveWishlistItem(jeans, entry(jeans.id, 6), MEASURED, NOW);
    expect(item.group).toBe('blocked');
    expect(item.size).toBeNull();
    expect(item.reason.kind).toBe('ineligible');
  });

  it('blocks everything, honestly, when there is no profile', () => {
    const resolution = resolveWishlist(pairs([{ id: 'wd-001', daysAgo: 2 }]), null, NOW);
    expect(resolution.counts.ready).toBe(0);
    expect(resolution.items[0].reason.kind).toBe('no-profile');
    expect(resolution.items[0].size).toBeNull();
  });

  it('never shows a size for an item it is not confident about', () => {
    const resolution = resolveWishlist(
      pairs(PRODUCTS.filter(isFitEligible).map((p) => ({ id: p.id, daysAgo: 9 }))),
      MEASURED,
      NOW,
    );
    resolution.items
      .filter((i) => i.recommendation?.confidence.withheld)
      .forEach((item) => {
        expect(item.size, item.product.id).toBeNull();
        expect(item.group, item.product.id).toBe('blocked');
      });
  });

  it('orders each group oldest-save first, because those lapse soonest', () => {
    const resolution = resolveWishlist(
      pairs([
        { id: 'wd-003', daysAgo: 4 },
        { id: 'wd-001', daysAgo: 22 },
        { id: 'wd-010', daysAgo: 13 },
      ]),
      MEASURED,
      NOW,
    );
    resolution.groups.forEach((group) => {
      const ages = group.items.map((i) => i.daysSaved);
      expect([...ages].sort((a, b) => b - a)).toEqual(ages);
    });
  });

  it('counts every item exactly once across the three groups', () => {
    const all = PRODUCTS.slice(0, 20).map((p) => ({ id: p.id, daysAgo: 5 }));
    const resolution = resolveWishlist(pairs(all), MEASURED, NOW);
    const total = resolution.counts.ready + resolution.counts.decide + resolution.counts.blocked;
    expect(total).toBe(all.length);
    expect(resolution.groups.reduce((acc, g) => acc + g.items.length, 0)).toBe(all.length);
  });

  it('is deterministic for the same profile, list and clock', () => {
    const list = pairs([
      { id: 'wd-002', daysAgo: 12 },
      { id: 'wd-009', daysAgo: 27 },
    ]);
    expect(resolveWishlist(list, MEASURED, NOW)).toEqual(resolveWishlist(list, MEASURED, NOW));
  });
});

describe('resolution records', () => {
  beforeEach(() => {
    clearResolutions();
    __resetResolutionCache();
  });

  it('records a pass against the profile version it was computed with', () => {
    expect(isResolved('wd-001', 1)).toBe(false);
    markResolved(['wd-001', 'wd-002'], 1);
    expect(isResolved('wd-001', 1)).toBe(true);
    expect(isResolved('wd-002', 1)).toBe(true);
  });

  it('invalidates every answer when the profile changes', () => {
    markResolved(['wd-001'], 1);
    // The shopper edits their measurements: the old answers are no longer
    // the answers.
    expect(isResolved('wd-001', 2)).toBe(false);
  });
});

describe('wishlist instrumentation', () => {
  beforeEach(() => {
    clearEvents();
    __resetAnalyticsCache();
  });

  it('counts a resolve pass under the wishlist_item_resolved metric', () => {
    track('wishlist_item_saved', { product_id: 'wd-001' });
    track('wishlist_item_resolved', { product_id: 'wd-001', wishlist_group: 'ready' });
    track('wishlist_item_resolved', { product_id: 'wd-002', wishlist_group: 'decide' });

    const counts = metricCounts(getEvents());
    const resolved = counts.find((c) => c.spec.id === 'wishlist_item_resolved')!;
    expect(resolved.count).toBe(2);
    expect(resolved.products).toBe(2);
  });

  it('excludes a blocked add-to-bag attempt from the added_to_bag metric', () => {
    track('add_to_bag', { product_id: 'wd-001', reason: 'blocked_no_size' });
    track('add_to_bag', { product_id: 'wd-001', selected_size: 'M' });
    track('wishlist_add_to_bag', { product_id: 'wd-002', selected_size: 'S' });

    const added = metricCounts(getEvents()).find((c) => c.spec.id === 'added_to_bag')!;
    expect(added.count).toBe(2);
  });

  it('counts only returns under return_reported', () => {
    track('fit_outcome_reported', { product_id: 'wd-001', outcome: 'kept' });
    track('fit_outcome_reported', {
      product_id: 'wd-002',
      outcome: 'returned',
      reason: 'too-small',
    });

    const returned = metricCounts(getEvents()).find((c) => c.spec.id === 'return_reported')!;
    expect(returned.count).toBe(1);
  });

  it('instruments every metric named on the success slide', () => {
    const ids = metricCounts(getEvents()).map((c) => c.spec.id);
    expect(ids).toEqual([
      'profile_started',
      'profile_completed',
      'recommendation_shown',
      'recommendation_followed',
      'size_selected',
      'added_to_bag',
      'wishlist_item_resolved',
      'order_placed',
      'return_reported',
    ]);
  });
});

describe('the primary metric', () => {
  beforeEach(() => {
    clearEvents();
    __resetAnalyticsCache();
  });

  it('reports no data rather than 0% with nothing saved', () => {
    expect(wishlistConversion(getEvents()).rate).toBeNull();
  });

  it('counts a purchase inside the window against the item that was saved', () => {
    track('wishlist_item_saved', { product_id: 'wd-001' });
    track('wishlist_item_saved', { product_id: 'wd-002' });
    track('wishlist_item_resolved', { product_id: 'wd-001' });
    track('purchase', { product_id: 'wd-001', order_id: 'NF1' });

    const readout = wishlistConversion(getEvents());
    expect(readout.saved).toBe(2);
    expect(readout.purchasedWithinWindow).toBe(1);
    expect(readout.purchasedAfterResolve).toBe(1);
    expect(readout.rate).toBeCloseTo(0.5, 6);
  });

  it('ignores a purchase of something that was never wishlisted', () => {
    track('wishlist_item_saved', { product_id: 'wd-001' });
    track('purchase', { product_id: 'wd-007', order_id: 'NF2' });
    expect(wishlistConversion(getEvents()).purchasedWithinWindow).toBe(0);
  });
});

describe('profile migration', () => {
  beforeEach(() => {
    clearFitProfile();
    __resetFitProfileCache();
  });

  it('upgrades a pre-method height/weight profile to the estimated path', () => {
    const legacy = { heightCm: 165, weightKg: 60, gender: 'female', preferredFit: 'regular' };
    const migrated = migrateProfile(legacy);
    expect(migrated).not.toBeNull();
    expect(migrated!.method).toBe('estimated');
    expect(migrated!.heightCm).toBe(165);
  });

  it('keeps a measured profile as measured', () => {
    const migrated = migrateProfile({
      method: 'measured',
      heightCm: 164,
      measurements: { bust: 35, waist: 29, hip: 38 },
      gender: 'female',
      preferredFit: 'regular',
    });
    expect(migrated!.method).toBe('measured');
    expect(migrated!.measurements).toEqual({ bust: 35, waist: 29, hip: 38 });
  });

  it('drops a record that satisfies neither branch', () => {
    expect(migrateProfile({ gender: 'female' })).toBeNull();
    expect(migrateProfile({ heightCm: 165 })).toBeNull();
    expect(migrateProfile(null)).toBeNull();
  });
});
