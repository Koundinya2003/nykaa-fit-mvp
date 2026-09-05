import { beforeEach, describe, expect, it } from 'vitest';
import { PRODUCTS, getProductById } from '@/data/products';
import type { WishlistEntry } from '@/types';
import type { FitProfile } from '../types/fitTypes';
import {
  resolveWishlist,
  resolveWishlistItem,
  savedAgoLabel,
  reasonLabel,
  daysSince,
} from '../utils/wishlistFit';
import { isFitEligible } from '../utils/eligibility';
import { addQuickStartItems, QUICK_START_COUNT } from '../utils/quickStart';
import { personalNotesFor } from '../utils/personalFitNotes';
import { __resetFitProfileCache, clearFitProfile, migrateProfile } from '../utils/fitStorage';
import { __resetOutcomeCache, clearOutcomes, type OutcomeRecord } from '../utils/fitOutcomes';
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

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 5);

const FULL: FitProfile = {
  measurements: { bust: 35, waist: 29.5, hip: 38.5 },
  preferredFit: 'regular',
  createdAt: 0,
  updatedAt: 1,
};

const dress = (id: string) => getProductById(id)!;
const entry = (productId: string, daysAgo: number): WishlistEntry => ({
  productId,
  addedAt: NOW - daysAgo * DAY,
});
const pairs = (items: { id: string; daysAgo: number }[]) =>
  items.map((i) => ({ product: dress(i.id), entry: entry(i.id, i.daysAgo) }));
const allDresses = (daysAgo = 4) =>
  pairs(PRODUCTS.filter(isFitEligible).map((p) => ({ id: p.id, daysAgo })));

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
    const item = resolveWishlistItem(dress('wd-003'), entry('wd-003', 27), FULL, NOW);
    expect(item.daysSaved).toBe(27);
    expect(item.daysLeftInWindow).toBe(3);
  });

  it('reports a lapsed item as past the window rather than clamping', () => {
    const item = resolveWishlistItem(dress('wd-003'), entry('wd-003', 41), FULL, NOW);
    expect(item.daysLeftInWindow).toBeLessThan(0);
  });
});

describe('grouping', () => {
  it('reaches "ready to buy" for at least one saved dress', () => {
    expect(resolveWishlist(allDresses(), FULL, NOW).counts.ready).toBeGreaterThan(0);
  });

  it('never puts an item in "ready to buy" without an in-stock size', () => {
    resolveWishlist(allDresses(), FULL, NOW)
      .items.filter((i) => i.group === 'ready')
      .forEach((item) => {
        expect(item.size, item.product.id).not.toBeNull();
        expect(item.inStock, item.product.id).toBe(true);
        expect(item.product.soldOutSizes, item.product.id).not.toContain(item.size);
        expect(item.recommendation!.confidence.withheld, item.product.id).toBe(false);
      });
  });

  it('blocks items outside the categories Nykaa Fit covers, and says why', () => {
    const jeans = PRODUCTS.find((p) => p.subcategory === 'jeans')!;
    const item = resolveWishlistItem(jeans, entry(jeans.id, 6), FULL, NOW);
    expect(item.group).toBe('blocked');
    expect(item.size).toBeNull();
    expect(item.reason.kind).toBe('ineligible');
  });

  it('distinguishes no profile from a profile with no measurements', () => {
    const none = resolveWishlist(pairs([{ id: 'wd-001', daysAgo: 2 }]), null, NOW);
    expect(none.items[0].reason.kind).toBe('no-profile');

    const empty: FitProfile = { ...FULL, measurements: {} };
    const blank = resolveWishlist(pairs([{ id: 'wd-001', daysAgo: 2 }]), empty, NOW);
    expect(blank.items[0].reason.kind).toBe('no-measurements');
    expect(blank.counts.ready).toBe(0);
  });

  it('shows no size for anything it is not confident about', () => {
    resolveWishlist(allDresses(9), FULL, NOW)
      .items.filter((i) => i.recommendation?.confidence.withheld)
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
      FULL,
      NOW,
    );
    resolution.groups.forEach((group) => {
      const ages = group.items.map((i) => i.daysSaved);
      expect([...ages].sort((a, b) => b - a)).toEqual(ages);
    });
  });

  it('counts every item exactly once across the three groups', () => {
    const all = PRODUCTS.slice(0, 20).map((p) => ({ id: p.id, daysAgo: 5 }));
    const r = resolveWishlist(pairs(all), FULL, NOW);
    expect(r.counts.ready + r.counts.decide + r.counts.blocked).toBe(all.length);
    expect(r.groups.reduce((acc, g) => acc + g.items.length, 0)).toBe(all.length);
  });

  it('is deterministic for the same profile, list and clock', () => {
    const list = pairs([
      { id: 'wd-002', daysAgo: 12 },
      { id: 'wd-009', daysAgo: 27 },
    ]);
    expect(resolveWishlist(list, FULL, NOW)).toEqual(resolveWishlist(list, FULL, NOW));
  });

  it('moves items up as measurements are added', () => {
    const partial: FitProfile = { ...FULL, measurements: { waist: 29.5 } };
    const partialReady = resolveWishlist(allDresses(), partial, NOW).counts.ready;
    const fullReady = resolveWishlist(allDresses(), FULL, NOW).counts.ready;
    // The payoff for giving all three has to be visible on this page.
    expect(fullReady).toBeGreaterThan(partialReady);
  });
});

describe('why an item needs a decision', () => {
  it('always names the size it is talking about', () => {
    resolveWishlist(allDresses(), FULL, NOW)
      .items.filter((i) => i.group === 'decide' && i.size)
      .forEach((item) => {
        expect(reasonLabel(item.reason), item.product.id).toContain(item.size!);
      });
  });

  it('asks for measurements only when they are actually missing', () => {
    resolveWishlist(allDresses(), FULL, NOW)
      .items.filter((i) => i.group === 'decide')
      .forEach((item) => {
        expect(reasonLabel(item.reason), item.product.id).not.toMatch(/add your/i);
      });
  });

  it('does ask for them when they are missing', () => {
    const partial: FitProfile = { ...FULL, measurements: { waist: 29.5 } };
    const labels = resolveWishlist(allDresses(), partial, NOW)
      .items.filter((i) => i.group === 'decide')
      .map((i) => reasonLabel(i.reason));
    if (labels.length > 0) {
      expect(labels.some((l) => /bust|hip/i.test(l))).toBe(true);
    }
  });
});

describe('quick start', () => {
  it('saves real catalogue products at the real time', () => {
    const { wishlist, added } = addQuickStartItems([], NOW);
    expect(added).toHaveLength(QUICK_START_COUNT);
    wishlist.forEach((e) => {
      expect(getProductById(e.productId), e.productId).toBeDefined();
      // Backdating these was how the old build faked a month of history.
      expect(e.addedAt).toBe(NOW);
    });
  });

  it('keeps what the shopper already saved', () => {
    const mine = [{ productId: 'wd-004', addedAt: NOW - 9 * DAY }];
    const { wishlist } = addQuickStartItems(mine, NOW);
    expect(wishlist).toContainEqual(mine[0]);
  });

  it('does not add a product twice', () => {
    const first = addQuickStartItems([], NOW).wishlist;
    const second = addQuickStartItems(first, NOW);
    expect(second.added).toHaveLength(0);
    expect(second.wishlist).toHaveLength(first.length);
  });

  it('populates all three groups so every state is reachable', () => {
    const { wishlist } = addQuickStartItems([], NOW);
    const r = resolveWishlist(
      wishlist.map((e) => ({ product: getProductById(e.productId)!, entry: e })),
      FULL,
      NOW,
    );
    expect(r.counts.ready).toBeGreaterThan(0);
    expect(r.counts.blocked).toBeGreaterThan(0);
  });
});

describe('resolution records', () => {
  beforeEach(() => {
    clearResolutions();
    __resetResolutionCache();
  });

  it('records a pass against the profile version it used', () => {
    expect(isResolved('wd-001', 1)).toBe(false);
    markResolved(['wd-001', 'wd-002'], 1);
    expect(isResolved('wd-001', 1)).toBe(true);
  });

  it('invalidates every answer when the measurements change', () => {
    markResolved(['wd-001'], 1);
    expect(isResolved('wd-001', 2)).toBe(false);
  });
});

describe('the shopper own fit history', () => {
  beforeEach(() => {
    clearOutcomes();
    __resetOutcomeCache();
  });

  const outcome = (o: Partial<OutcomeRecord> = {}): OutcomeRecord => ({
    id: Math.random().toString(),
    orderId: 'NF1',
    productId: 'wd-009',
    brand: 'Kazo',
    size: 'M',
    outcome: 'returned',
    reason: 'too-small',
    ts: NOW,
    ...o,
  });

  it('says nothing about a brand she has never reported on', () => {
    expect(personalNotesFor('Kazo', [])).toHaveLength(0);
    expect(personalNotesFor('Kazo', [outcome({ brand: 'Libas' })])).toHaveLength(0);
  });

  it('turns her returns into advice attributed to her', () => {
    const notes = personalNotesFor('Kazo', [outcome()]);
    expect(notes).toHaveLength(1);
    expect(notes[0].source).toBe('you');
    expect(notes[0].direction).toBe('up');
    expect(notes[0].body).toMatch(/not moved the recommendation/i);
  });

  it('refuses to pick a side when her reports contradict each other', () => {
    const notes = personalNotesFor('Kazo', [
      outcome({ reason: 'too-small' }),
      outcome({ reason: 'too-large' }),
    ]);
    expect(notes[0].direction).toBeNull();
    expect(notes[0].id).toBe('you-mixed');
  });

  it('ignores returns that say nothing about sizing', () => {
    const notes = personalNotesFor('Kazo', [outcome({ reason: 'style' })]);
    expect(notes.every((n) => n.direction === null)).toBe(true);
  });

  it('never changes the recommended size', () => {
    const product = dress('wd-009');
    const plain = resolveWishlistItem(product, entry('wd-009', 3), FULL, NOW);
    const withHistory = resolveWishlistItem(
      product,
      entry('wd-009', 3),
      FULL,
      NOW,
      personalNotesFor('Kazo', [outcome(), outcome(), outcome()]),
    );
    expect(withHistory.size).toBe(plain.size);
  });
});

describe('instrumentation', () => {
  beforeEach(() => {
    clearEvents();
    __resetAnalyticsCache();
  });

  it('instruments every metric named on the success slide', () => {
    expect(metricCounts(getEvents()).map((c) => c.spec.id)).toEqual([
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

  it('excludes a blocked add-to-bag attempt from the added_to_bag metric', () => {
    track('add_to_bag', { product_id: 'wd-001', reason: 'blocked_no_size' });
    track('add_to_bag', { product_id: 'wd-001', selected_size: 'M' });
    track('wishlist_add_to_bag', { product_id: 'wd-002', selected_size: 'S' });
    expect(metricCounts(getEvents()).find((c) => c.spec.id === 'added_to_bag')!.count).toBe(2);
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

  it('never carries a body measurement in an event payload', () => {
    track('wishlist_item_resolved', {
      product_id: 'wd-001',
      recommended_size: 'M',
      confidence_level: 'high',
      measurements_given: 3,
    });
    track('fit_recommendation_shown', { product_id: 'wd-001', recommended_size: 'M' });
    const serialised = JSON.stringify(getEvents());
    ['bust', 'waist', 'hip', 'heightCm', 'measurements"'].forEach((field) => {
      expect(serialised).not.toContain(field);
    });
  });
});

describe('profile migration', () => {
  beforeEach(() => {
    clearFitProfile();
    __resetFitProfileCache();
  });

  it('keeps a measured profile', () => {
    const m = migrateProfile({
      measurements: { bust: 35, waist: 29, hip: 38 },
      preferredFit: 'slim',
    });
    expect(m!.measurements).toEqual({ bust: 35, waist: 29, hip: 38 });
    expect(m!.preferredFit).toBe('slim');
  });

  it('never promotes an old height/weight estimate to a measurement', () => {
    // The v1 shape stored height and weight and estimated the girths.
    const legacy = { heightCm: 165, weightKg: 60, gender: 'female', preferredFit: 'relaxed' };
    const m = migrateProfile(legacy);
    expect(m).not.toBeNull();
    expect(m!.measurements).toEqual({});
    // Her stated preference is hers, so it survives; the guess does not.
    expect(m!.preferredFit).toBe('relaxed');
  });

  it('drops values that are not usable measurements', () => {
    const m = migrateProfile({
      measurements: { bust: 'thirty-five', waist: -4, hip: 38 },
      preferredFit: 'regular',
    });
    expect(m!.measurements).toEqual({ hip: 38 });
  });

  it('returns null for junk', () => {
    expect(migrateProfile(null)).toBeNull();
    expect(migrateProfile({})).toBeNull();
  });
});
