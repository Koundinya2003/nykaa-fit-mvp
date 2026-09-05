import { beforeEach, describe, expect, it } from 'vitest';
import { PRODUCTS, getProductById } from '@/data/products';
import { getRatingBreakdown, getReviews, meanOf, solveDistribution } from '@/data/reviews';
import type { FitProfile } from '../types/fitTypes';
import { recommendForProduct } from '../engine/fitEngine';
import {
  allBrandFitHistories,
  brandFitHistory,
  computeBrandFitHistory,
} from '../engine/brandFitHistory';
import {
  __resetOutcomeCache,
  clearOutcomes,
  recordOutcome,
  type OutcomeRecord,
} from '../utils/fitOutcomes';
import { isFitEligible } from '../utils/eligibility';

/* =========================================================================
   The two claims that would be dishonest if untested:

     1. The cross-brand comparison is driven by data, not by a constant.
     2. Reporting a return changes a later recommendation.
   ========================================================================= */

const MEASURED: FitProfile = {
  method: 'measured',
  measurements: { bust: 35, waist: 29.5, hip: 38.5 },
  heightCm: 164,
  gender: 'female',
  preferredFit: 'regular',
  createdAt: 0,
  updatedAt: 1,
};

function outcome(overrides: Partial<OutcomeRecord> = {}): OutcomeRecord {
  return {
    id: `o_${Math.random()}`,
    orderId: 'NF1',
    productId: 'wd-009',
    brand: 'Kazo',
    size: 'M',
    outcome: 'returned',
    reason: 'too-small',
    ts: Date.now(),
    ...overrides,
  };
}

describe('per-brand fit history', () => {
  beforeEach(() => {
    clearOutcomes();
    __resetOutcomeCache();
  });

  it('derives a different reading for every brand in the experiment', () => {
    const histories = allBrandFitHistories();
    expect(histories.length).toBeGreaterThan(5);
    // If every brand read the same, "your size isn't universal" would be a
    // slogan rather than a finding.
    expect(new Set(histories.map((h) => h.appliedEase)).size).toBeGreaterThan(1);
  });

  it('builds its evidence from the review corpus, not from a constant', () => {
    const brands = new Set(PRODUCTS.filter(isFitEligible).map((p) => p.brand));
    brands.forEach((brand) => {
      const history = brandFitHistory(brand);
      expect(history.reviewCount, brand).toBeGreaterThan(0);
      expect(history.observedEase, brand).not.toBeNull();
    });
  });

  it('falls back to the published label when there is no evidence at all', () => {
    const history = computeBrandFitHistory('Nonexistent Brand', { ease: -0.5 }, []);
    expect(history.reviewCount).toBe(0);
    expect(history.observedEase).toBeNull();
    expect(history.appliedEase).toBe(-0.5);
    expect(history.label).toBe('Not enough fit history yet');
  });

  it('scores agreement lower when the evidence contradicts itself', () => {
    const agreeing = computeBrandFitHistory('B', { ease: 0 }, [
      outcome({ brand: 'B', reason: 'too-small' }),
      outcome({ brand: 'B', reason: 'too-small' }),
      outcome({ brand: 'B', reason: 'too-small' }),
    ]);
    const conflicting = computeBrandFitHistory('B', { ease: 0 }, [
      outcome({ brand: 'B', reason: 'too-small' }),
      outcome({ brand: 'B', reason: 'too-large' }),
      outcome({ brand: 'B', reason: 'too-small' }),
    ]);
    expect(conflicting.consistency).toBeLessThan(agreeing.consistency);
    expect(conflicting.dataConfidence).toBeLessThan(agreeing.dataConfidence);
  });

  it('ignores non-sizing returns when estimating ease', () => {
    const sizing = computeBrandFitHistory('B', { ease: 0 }, [
      outcome({ brand: 'B', reason: 'too-small' }),
    ]);
    const style = computeBrandFitHistory('B', { ease: 0 }, [
      outcome({ brand: 'B', reason: 'style' }),
    ]);
    // A return for the style says nothing about the sizing.
    expect(style.appliedEase).toBe(0);
    expect(sizing.appliedEase).toBeLessThan(0);
    // It is still counted as an outcome, because it happened.
    expect(style.outcomeCount).toBe(1);
  });

  it('weights a reported outcome above a review opinion', () => {
    const one = computeBrandFitHistory('Kazo', { ease: -0.8 }, [
      outcome({ brand: 'Kazo' }),
    ]);
    const none = computeBrandFitHistory('Kazo', { ease: -0.8 }, []);
    // One return moves the applied ease by more than one review's worth.
    expect(Math.abs(one.appliedEase - none.appliedEase)).toBeGreaterThan(0.02);
    expect(one.weight - none.weight).toBe(6);
  });
});

describe('the outcome feedback loop', () => {
  beforeEach(() => {
    clearOutcomes();
    __resetOutcomeCache();
  });

  it('persists a reported outcome', () => {
    recordOutcome({
      orderId: 'NF1',
      productId: 'wd-009',
      brand: 'Kazo',
      size: 'M',
      outcome: 'returned',
      reason: 'too-small',
      recommendedSize: 'M',
    });
    const history = brandFitHistory('Kazo');
    expect(history.outcomeCount).toBe(1);
    expect(history.returnCount).toBe(1);
  });

  it('shifts the brand toward running smaller after a "too small" return', () => {
    const before = brandFitHistory('Kazo').appliedEase;
    recordOutcome({
      orderId: 'NF1',
      productId: 'wd-009',
      brand: 'Kazo',
      size: 'M',
      outcome: 'returned',
      reason: 'too-small',
    });
    const after = brandFitHistory('Kazo');
    expect(after.appliedEase).toBeLessThan(before);
    expect(after.shiftedByOutcomes).toBe(true);
    expect(after.outcomeShift).toBeLessThan(0);
  });

  it('leaves other brands alone', () => {
    const otherBefore = brandFitHistory('Libas').appliedEase;
    recordOutcome({
      orderId: 'NF1',
      productId: 'wd-009',
      brand: 'Kazo',
      size: 'M',
      outcome: 'returned',
      reason: 'too-small',
    });
    expect(brandFitHistory('Libas').appliedEase).toBe(otherBefore);
    expect(brandFitHistory('Libas').shiftedByOutcomes).toBe(false);
  });

  it('changes the size it recommends once enough returns agree', () => {
    // Vero Moda's midi: this profile is recommended L, and two shoppers
    // reporting it came back too large is enough evidence to move the answer.
    const product = getProductById('wd-002')!;
    const before = recommendForProduct(MEASURED, product)!;
    expect(before.recommendedSize).toBe('L');

    for (let i = 0; i < 2; i += 1) {
      recordOutcome({
        orderId: `NF${i}`,
        productId: 'wd-002',
        brand: 'Vero Moda',
        size: 'L',
        outcome: 'returned',
        reason: 'too-large',
      });
    }

    const after = recommendForProduct(MEASURED, product)!;
    expect(after.recommendedSize).toBe('M');
    expect(after.appliedBrandEase).toBeGreaterThan(before.appliedBrandEase);
  });

  it('moves the brand correction on the very first report, and says so', () => {
    const product = getProductById('wd-009')!;
    const before = recommendForProduct(MEASURED, product)!;

    recordOutcome({
      orderId: 'NF1',
      productId: 'wd-009',
      brand: 'Kazo',
      size: before.recommendedSize,
      outcome: 'returned',
      reason: 'too-small',
    });

    const after = recommendForProduct(MEASURED, product)!;
    // Not necessarily a different size after one report — but the correction
    // behind it moves immediately, and the explanation names the reason.
    expect(after.appliedBrandEase).toBeLessThan(before.appliedBrandEase);
    expect(after.explanation.product.some((r) => r.value.includes('reported outcomes'))).toBe(
      true,
    );
    expect(
      after.explanation.adjustments.some((a) => a.label.includes('updated by fit reports')),
    ).toBe(true);
  });

  it('moves a brand the other way when the returns say it runs large', () => {
    const product = getProductById('wd-009')!;
    const before = recommendForProduct(MEASURED, product)!;
    for (let i = 0; i < 3; i += 1) {
      recordOutcome({
        orderId: `NF${i}`,
        productId: 'wd-009',
        brand: 'Kazo',
        size: before.recommendedSize,
        outcome: 'returned',
        reason: 'too-large',
      });
    }
    expect(recommendForProduct(MEASURED, product)!.appliedBrandEase).toBeGreaterThan(
      before.appliedBrandEase,
    );
  });

  it('a keep nudges the brand toward its own chart rather than away from it', () => {
    const drifted = computeBrandFitHistory('Kazo', { ease: -0.8 }, []);
    const withKeeps = computeBrandFitHistory('Kazo', { ease: -0.8 }, [
      outcome({ brand: 'Kazo', outcome: 'kept', reason: undefined }),
      outcome({ brand: 'Kazo', outcome: 'kept', reason: undefined }),
    ]);
    // A garment that was kept is evidence the size was right, so it pulls the
    // correction toward zero rather than deepening it.
    expect(withKeeps.appliedEase).toBeGreaterThan(drifted.appliedEase);
    expect(withKeeps.outcomeCount).toBe(2);
    expect(withKeeps.returnCount).toBe(0);
  });
});

/* =========================================================================
   Review integrity.
   ========================================================================= */

describe('rating distributions', () => {
  it('reconciles with the displayed average for every product', () => {
    PRODUCTS.forEach((p) => {
      const buckets = getRatingBreakdown(p);
      const total = buckets.reduce((a, b) => a + b, 0);
      expect(total, p.id).toBe(p.reviewCount);
      // The bars and the headline number must describe one population.
      expect(meanOf(buckets), p.id).toBeCloseTo(p.rating, 2);
    });
  });

  it('does not pile every rating into one bucket', () => {
    // wd-002 is the product that used to show 642 four-star ratings under a
    // 4.1 average.
    const wd002 = getProductById('wd-002')!;
    const buckets = getRatingBreakdown(wd002);
    expect(buckets.filter((n) => n > 0).length).toBeGreaterThan(1);
    expect(meanOf(buckets)).toBeCloseTo(4.1, 2);
  });

  it('solves for the mean at any plausible rating and volume', () => {
    [3.2, 3.8, 4.0, 4.1, 4.4, 4.7].forEach((rating) => {
      [40, 288, 642, 1284].forEach((total) => {
        const buckets = solveDistribution(rating, total);
        expect(buckets.reduce((a, b) => a + b, 0)).toBe(total);
        expect(meanOf(buckets)).toBeCloseTo(rating, 2);
      });
    });
  });

  it('returns an empty histogram rather than dividing by zero', () => {
    expect(solveDistribution(4.2, 0)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('reviewer plausibility', () => {
  it("uses women's names on womenswear and men's names on menswear", () => {
    const MALE_MARKERS = ['Rohan M.', 'Vikram H.', 'Aditya V.', 'Karthik N.', 'Arjun T.'];
    const FEMALE_MARKERS = ['Ananya R.', 'Priya S.', 'Sneha K.', 'Meera J.'];

    PRODUCTS.filter((p) => p.gender === 'women').forEach((p) => {
      getReviews(p.id).forEach((r) => {
        expect(MALE_MARKERS, `${p.id} / ${r.author}`).not.toContain(r.author);
      });
    });

    PRODUCTS.filter((p) => p.gender === 'men').forEach((p) => {
      getReviews(p.id).forEach((r) => {
        expect(FEMALE_MARKERS, `${p.id} / ${r.author}`).not.toContain(r.author);
      });
    });
  });

  it('only ever quotes a size the product actually sells and stocks', () => {
    PRODUCTS.forEach((p) => {
      const available = p.sizes.filter((s) => !p.soldOutSizes.includes(s));
      getReviews(p.id).forEach((r) => {
        expect(available.length === 0 ? p.sizes : available, p.id).toContain(r.sizeBought);
      });
    });
  });

  it('concentrates reviewed sizes in the middle of the run, as demand does', () => {
    // Across the whole catalogue, the extremes of each run should be rarer
    // than the middle — a uniform draw is what made XL bodycon reviews as
    // common as M.
    let middle = 0;
    let extreme = 0;
    PRODUCTS.forEach((p) => {
      const available = p.sizes.filter((s) => !p.soldOutSizes.includes(s));
      getReviews(p.id).forEach((r) => {
        const i = available.indexOf(r.sizeBought);
        if (i === -1) return;
        if (i === 0 || i === available.length - 1) extreme += 1;
        else middle += 1;
      });
    });
    expect(middle).toBeGreaterThan(extreme);
  });

  it('shows reviews drawn from the same distribution as the bars', () => {
    // Every listed star value must be one the histogram has ratings in.
    PRODUCTS.forEach((p) => {
      const buckets = getRatingBreakdown(p);
      getReviews(p.id).forEach((r) => {
        expect(buckets[r.rating - 1], `${p.id} @ ${r.rating}★`).toBeGreaterThan(0);
      });
    });
  });
});
