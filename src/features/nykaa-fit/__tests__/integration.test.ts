import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PRODUCTS } from '@/data/products';
import type { FitProfile } from '../types/fitTypes';
import { recommendForProduct } from '../engine/fitEngine';
import { isFitEligible } from '../utils/eligibility';
import {
  __resetFitProfileCache,
  clearFitProfile,
  getFitProfile,
  hasMeasurements,
  saveFitProfile,
  subscribeFitProfile,
} from '../utils/fitStorage';
import {
  __resetAnalyticsCache,
  __resetTrackOnce,
  behaviourMetrics,
  buildFunnel,
  clearEvents,
  conversionReadout,
  getEvents,
  MIN_ARM_VIEWS,
  projectImpact,
  registerSink,
  track,
  trackOnce,
  type AnalyticsEvent,
} from '../analytics/fitAnalytics';
import { assignVariant, hashToUnitInterval } from '../experiment/variant';

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const SHOPPER: Omit<FitProfile, 'createdAt' | 'updatedAt'> = {
  measurements: { bust: 35, waist: 29.5, hip: 38.5 },
  preferredFit: 'regular',
};

describe('eligibility', () => {
  it("enables Nykaa Fit only for women's dresses", () => {
    const eligible = PRODUCTS.filter(isFitEligible);
    expect(eligible.length).toBeGreaterThan(0);
    eligible.forEach((p) => {
      expect(p.subcategory).toBe('dresses');
      expect(p.gender).toBe('women');
      expect(p.sizeChart).toBeDefined();
    });
    const ineligible = PRODUCTS.filter((p) => !isFitEligible(p));
    expect(ineligible.some((p) => p.subcategory === 'jeans')).toBe(true);
  });

  it('gives every eligible product its own brand chart', () => {
    const charts = PRODUCTS.filter(isFitEligible).map((p) => JSON.stringify(p.sizeChart?.M ?? {}));
    // Brands genuinely disagree about what "M" means. This is the premise.
    expect(new Set(charts).size).toBeGreaterThan(1);
  });
});

describe('catalogue recommendations', () => {
  const profile: FitProfile = { ...SHOPPER, createdAt: 0, updatedAt: 0 };

  it('produces a recommendation for every eligible product', () => {
    PRODUCTS.filter(isFitEligible).forEach((p) => {
      const rec = recommendForProduct(profile, p);
      expect(rec, p.id).not.toBeNull();
      expect(p.sizes).toContain(rec!.recommendedSize);
    });
  });

  it('does not give the same shopper the same size everywhere', () => {
    const sizes = PRODUCTS.filter(isFitEligible)
      .map((p) => recommendForProduct(profile, p)!)
      .filter((r) => !r.confidence.withheld)
      .map((r) => r.recommendedSize);
    expect(new Set(sizes).size).toBeGreaterThan(1);
  });

  it('reaches high confidence somewhere in the catalogue', () => {
    const levels = PRODUCTS.filter(isFitEligible).map(
      (p) => recommendForProduct(profile, p)!.confidence.level,
    );
    expect(levels).toContain('high');
  });

  it('never recommends a sold-out size while another is in stock', () => {
    PRODUCTS.filter(isFitEligible).forEach((p) => {
      const rec = recommendForProduct(profile, p)!;
      if (p.sizes.some((s) => !p.soldOutSizes.includes(s))) {
        expect(p.soldOutSizes, p.id).not.toContain(rec.recommendedSize);
      }
    });
  });

  it('returns nothing for products outside the experiment', () => {
    const jeans = PRODUCTS.find((p) => p.subcategory === 'jeans')!;
    expect(recommendForProduct(profile, jeans)).toBeNull();
  });

  it('moves the whole catalogue up a size for a larger shopper', () => {
    const larger: FitProfile = {
      ...profile,
      measurements: { bust: 40, waist: 34, hip: 43 },
    };
    const eligible = PRODUCTS.filter(isFitEligible);
    const avg = (who: FitProfile) =>
      eligible.reduce(
        (acc, p) => acc + SIZE_ORDER.indexOf(recommendForProduct(who, p)!.idealSize),
        0,
      ) / eligible.length;
    expect(avg(larger)).toBeGreaterThan(avg(profile));
  });
});

/* =========================================================================
   The rule this rebuild exists to enforce.

   A recommendation may consult the shopper's own measurements and the
   brand's published chart, and nothing else. That is easy to state, easy to
   verify once, and very easy to erode later — the previous build drifted
   into aggregating generated review sentiment per brand and presenting it
   as "18 fit reports".

   So it is asserted structurally rather than by inspection: the engine
   directory must not import the review corpus at all.
   ========================================================================= */
describe('no fabricated customer data', () => {
  const engineDir = join(__dirname, '..', 'engine');

  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return name === '__tests__' ? [] : sourceFiles(full);
      return full.endsWith('.ts') ? [full] : [];
    });

  it('never imports the review corpus into the engine', () => {
    sourceFiles(engineDir).forEach((file) => {
      const body = readFileSync(file, 'utf8');
      expect(body, file).not.toMatch(/from '@\/data\/reviews'/);
      expect(body, file).not.toMatch(/getReviews|fitFeedback|reviewCount/);
    });
  });

  it('has no body estimator left to call', () => {
    sourceFiles(engineDir).forEach((file) => {
      const body = readFileSync(file, 'utf8');
      expect(body, file).not.toMatch(/estimateBody|girthIndex/);
    });
  });

  it('reports only measurements the shopper actually gave', () => {
    const partial: FitProfile = {
      measurements: { waist: 29.5 },
      preferredFit: 'regular',
      createdAt: 0,
      updatedAt: 0,
    };
    const rec = recommendForProduct(partial, PRODUCTS.find(isFitEligible)!)!;
    expect(rec.body).toEqual({ waist: 29.5 });
    expect(rec.receipt.inputsUsed.some((i) => /bust|hip/i.test(i.label))).toBe(false);
    expect(rec.receipt.inputsMissing).toHaveLength(2);
  });

  it('names its exclusions on every recommendation', () => {
    const profile: FitProfile = { ...SHOPPER, createdAt: 0, updatedAt: 0 };
    PRODUCTS.filter(isFitEligible).forEach((p) => {
      const rec = recommendForProduct(profile, p)!;
      expect(rec.receipt.notUsed.length, p.id).toBeGreaterThan(0);
    });
  });
});

describe('fit profile persistence', () => {
  beforeEach(() => {
    clearFitProfile();
    __resetFitProfileCache();
  });

  it('round-trips a saved profile', () => {
    expect(getFitProfile()).toBeNull();
    const saved = saveFitProfile(SHOPPER);
    expect(saved.createdAt).toBeGreaterThan(0);

    __resetFitProfileCache(); // Simulate a fresh page load.
    const reloaded = getFitProfile()!;
    expect(reloaded.measurements).toEqual(SHOPPER.measurements);
    expect(reloaded.preferredFit).toBe('regular');
  });

  it('keeps createdAt but advances updatedAt on edit', () => {
    const first = saveFitProfile(SHOPPER);
    const edited = saveFitProfile({ ...SHOPPER, preferredFit: 'relaxed' });
    expect(edited.createdAt).toBe(first.createdAt);
    expect(edited.updatedAt).toBeGreaterThanOrEqual(first.updatedAt);
    expect(edited.preferredFit).toBe('relaxed');
  });

  it('knows when a profile has nothing to compare against', () => {
    expect(hasMeasurements(null)).toBe(false);
    expect(hasMeasurements(saveFitProfile({ ...SHOPPER, measurements: {} }))).toBe(false);
    expect(hasMeasurements(saveFitProfile(SHOPPER))).toBe(true);
  });

  it('notifies subscribers on save and clear', () => {
    let calls = 0;
    const unsubscribe = subscribeFitProfile(() => {
      calls += 1;
    });
    saveFitProfile(SHOPPER);
    clearFitProfile();
    unsubscribe();
    saveFitProfile(SHOPPER);
    expect(calls).toBe(2);
  });

  it('recovers from corrupted storage rather than throwing', () => {
    window.localStorage.setItem('nykaafit.fitProfile.v2', '{not json');
    __resetFitProfileCache();
    expect(getFitProfile()).toBeNull();
  });

  it('reuses one profile across brands, which is the whole promise', () => {
    saveFitProfile(SHOPPER);
    __resetFitProfileCache();
    const stored = getFitProfile()!;
    const [first, second] = PRODUCTS.filter(isFitEligible);
    expect(first.brand).not.toBe(second.brand);
    expect(recommendForProduct(stored, first)).not.toBeNull();
    expect(recommendForProduct(stored, second)).not.toBeNull();
  });
});

describe('analytics', () => {
  beforeEach(() => {
    clearEvents();
    __resetAnalyticsCache();
  });

  it('records events with an experiment group, session and timestamp', () => {
    track('product_view', { product_id: 'wd-001', fit_eligible: true });
    const [event] = getEvents();
    expect(event.name).toBe('product_view');
    expect(event.props.product_id).toBe('wd-001');
    expect(event.experiment_group).toBeTruthy();
    expect(event.session).toBeTruthy();
    expect(event.ts).toBeGreaterThan(0);
  });

  it('stamps the experiment group on every event, whatever the name', () => {
    (
      [
        'product_view',
        'fit_cta_clicked',
        'size_changed_after_recommendation',
        'checkout_started',
        'purchase',
      ] as const
    ).forEach((name) => track(name, { product_id: 'wd-001' }));
    expect(getEvents()).toHaveLength(5);
    getEvents().forEach((e) => expect(['control', 'treatment']).toContain(e.experiment_group));
  });

  it('never carries body measurements in an event payload', () => {
    // Every event the app can emit, with the richest payload each one uses.
    track('fit_recommendation_shown', {
      product_id: 'wd-001',
      recommended_size: 'M',
      match_quality: 'Strong match',
      match_score: 82,
    });
    track('size_selected', {
      product_id: 'wd-001',
      recommended_size: 'M',
      selected_size: 'L',
      changed_from_recommendation: true,
    });
    track('add_to_bag', { product_id: 'wd-001', selected_size: 'L', value: 1799 });

    const serialised = JSON.stringify(getEvents());
    ['heightCm', 'bust', 'waist', 'hip', 'measurements"'].forEach((field) => {
      expect(serialised).not.toContain(field);
    });
  });

  it('separates using the feature from being persuaded by it', () => {
    track('fit_recommendation_shown', { product_id: 'wd-001', recommended_size: 'M' });
    track('size_changed_after_recommendation', {
      product_id: 'wd-001',
      recommended_size: 'M',
      selected_size: 'L',
    });
    track('add_to_bag', {
      product_id: 'wd-001',
      recommended_size: 'M',
      selected_size: 'L',
      changed_from_recommendation: true,
    });

    const behaviour = behaviourMetrics(getEvents());
    const changed = behaviour.find((m) => m.id === 'size-change')!;
    expect(changed.numerator).toBe(1);

    const addedOnRec = behaviour.find((m) => m.id === 'added-recommended')!;
    expect(addedOnRec.numerator).toBe(0);
    expect(addedOnRec.denominator).toBe(1);
  });

  it('fans out to additional sinks so a real provider can be attached', () => {
    const received: AnalyticsEvent[] = [];
    const detach = registerSink({ name: 'test', send: (e) => received.push(e) });
    track('fit_cta_clicked', { product_id: 'wd-002' });
    detach();
    track('fit_cta_clicked', { product_id: 'wd-003' });
    expect(received).toHaveLength(1);
    expect(received[0].props.product_id).toBe('wd-002');
  });

  it('survives a sink that throws', () => {
    const detach = registerSink({
      name: 'broken',
      send: () => {
        throw new Error('provider down');
      },
    });
    expect(() => track('add_to_bag', { product_id: 'wd-001' })).not.toThrow();
    detach();
    expect(getEvents().some((e) => e.name === 'add_to_bag')).toBe(true);
  });

  it('withholds a conversion rate until an arm clears the display floor', () => {
    track('product_view', { product_id: 'wd-001' });
    track('add_to_bag', { product_id: 'wd-001', selected_size: 'M' });

    const readout = conversionReadout(getEvents());
    // One view is not a conversion rate, however tempting the arithmetic.
    expect(readout.treatment.addToBagCvr).toBeNull();
    expect(readout.control.addToBagCvr).toBeNull();
    expect(readout.addToBagLift).toBeNull();
    expect(readout.treatment.underpowered || readout.control.underpowered).toBe(true);
  });

  it('never reports a lift when only one arm has data', () => {
    for (let i = 0; i < MIN_ARM_VIEWS + 5; i += 1) {
      track('product_view', { product_id: `p-${i}` });
    }
    const readout = conversionReadout(getEvents());
    // Whichever arm this browser is in, the other one is empty.
    expect(readout.addToBagLift).toBeNull();
  });

  it('builds a funnel from the recorded events', () => {
    track('product_view', { product_id: 'wd-001' });
    track('fit_cta_clicked', { product_id: 'wd-001' });
    track('fit_recommendation_accepted', { product_id: 'wd-001', recommended_size: 'M' });
    track('add_to_bag', { product_id: 'wd-001', selected_size: 'M' });

    const funnel = buildFunnel(getEvents());
    const step = (name: string) => funnel.find((f) => f.name === name)!;
    expect(step('product_view').count).toBe(1);
    expect(step('fit_cta_clicked').count).toBe(1);
    expect(step('fit_recommendation_accepted').count).toBe(1);
    expect(step('add_to_bag').count).toBe(1);
    expect(step('purchase').count).toBe(0);
  });
});

describe('impression de-duplication', () => {
  beforeEach(() => {
    clearEvents();
    __resetAnalyticsCache();
    __resetTrackOnce();
  });

  it('fires a keyed event only once, however many times it is called', () => {
    // React StrictMode invokes effects twice in development; this is the guard.
    trackOnce('product_view:v1:wd-001', 'product_view', { product_id: 'wd-001' });
    trackOnce('product_view:v1:wd-001', 'product_view', { product_id: 'wd-001' });
    trackOnce('product_view:v1:wd-001', 'product_view', { product_id: 'wd-001' });
    expect(getEvents().filter((e) => e.name === 'product_view')).toHaveLength(1);
  });

  it('fires again for a new view of the same product', () => {
    trackOnce('product_view:v1:wd-001', 'product_view', { product_id: 'wd-001' });
    trackOnce('product_view:v2:wd-001', 'product_view', { product_id: 'wd-001' });
    expect(getEvents().filter((e) => e.name === 'product_view')).toHaveLength(2);
  });
});

describe('experiment assignment', () => {
  it('sends everyone to control at allocation 0 and treatment at 1', () => {
    ['u_a', 'u_b', 'u_c'].forEach((id) => {
      expect(assignVariant(id, 0)).toBe('control');
      expect(assignVariant(id, 1)).toBe('treatment');
    });
  });

  it('is deterministic for a given unit', () => {
    const first = assignVariant('u_stable', 0.5);
    for (let i = 0; i < 20; i += 1) {
      expect(assignVariant('u_stable', 0.5)).toBe(first);
    }
  });

  it('splits roughly evenly at 50% across many units', () => {
    let treatment = 0;
    const n = 2000;
    for (let i = 0; i < n; i += 1) {
      if (assignVariant(`unit_${i}`, 0.5) === 'treatment') treatment += 1;
    }
    // A hash is not a coin, but it should not be wildly skewed either.
    expect(treatment / n).toBeGreaterThan(0.44);
    expect(treatment / n).toBeLessThan(0.56);
  });

  it('hashes into the unit interval', () => {
    ['', 'a', 'a-longer-unit-id', 'u_123'].forEach((v) => {
      const h = hashToUnitInterval(v);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
    });
  });
});

describe('impact model', () => {
  const base = {
    monthlyEligibleViews: 100000,
    baselineAddToBagCvr: 0.1,
    expectedConversionLift: 0.05,
    averageOrderValue: 2000,
    baselineSizeReturnRate: 0.1,
    expectedReturnReduction: 0.2,
    averageReturnCost: 300,
  };

  it('computes incremental orders and GMV from the assumptions', () => {
    const p = projectImpact(base);
    expect(p.baselineOrders).toBe(10000);
    expect(p.incrementalOrders).toBeCloseTo(500, 6);
    expect(p.incrementalGmv).toBeCloseTo(1000000, 6);
  });

  it('bases returns avoided on orders after the lift', () => {
    const p = projectImpact(base);
    expect(p.returnsAvoided).toBeCloseTo((10000 + 500) * 0.1 * 0.2, 6);
    expect(p.returnCostSaved).toBeCloseTo(p.returnsAvoided * 300, 6);
    expect(p.totalUpside).toBeCloseTo(p.incrementalGmv + p.returnCostSaved, 6);
  });

  it('returns zero upside when no lift is assumed', () => {
    const p = projectImpact({ ...base, expectedConversionLift: 0, expectedReturnReduction: 0 });
    expect(p.incrementalGmv).toBe(0);
    expect(p.returnCostSaved).toBe(0);
  });
});
