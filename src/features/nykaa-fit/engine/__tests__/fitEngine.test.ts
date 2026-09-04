import { describe, expect, it } from 'vitest';
import type { FitProductInput, FitProfile, PreferredFit } from '../../types/fitTypes';
import { recommendSize } from '../fitEngine';
import { estimateBody, girthIndex } from '../bodyModel';

/* =========================================================================
   Recommendation engine tests.

   The engine is pure, so every case here is a straight input -> output
   assertion with no mocking.
   ========================================================================= */

const CHART = {
  XS: { bust: 32, waist: 26, hip: 34.5 },
  S: { bust: 34, waist: 28, hip: 36.5 },
  M: { bust: 36, waist: 30, hip: 38.5 },
  L: { bust: 38, waist: 32, hip: 40.5 },
  XL: { bust: 40, waist: 34, hip: 42.5 },
  XXL: { bust: 42, waist: 36, hip: 44.5 },
};

function product(overrides: Partial<FitProductInput> = {}): FitProductInput {
  return {
    id: 'test-dress',
    brand: 'Test Brand',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    soldOutSizes: [],
    sizeChart: CHART,
    fitClass: 'regular',
    brandSizing: { label: 'True to size', ease: 0, note: '' },
    ...overrides,
  };
}

function profile(overrides: Partial<FitProfile> = {}): FitProfile {
  return {
    heightCm: 165,
    weightKg: 60,
    gender: 'female',
    preferredFit: 'regular',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const indexOf = (size: string) => SIZE_ORDER.indexOf(size);

describe('body model', () => {
  it('scales girth with mass and inversely with height', () => {
    expect(girthIndex(160, 58)).toBeCloseTo(6.02, 2);
    expect(girthIndex(160, 75)).toBeGreaterThan(girthIndex(160, 58));
    expect(girthIndex(180, 58)).toBeLessThan(girthIndex(160, 58));
  });

  it('produces larger measurements for a heavier body at the same height', () => {
    const light = estimateBody(profile({ heightCm: 165, weightKg: 50 }));
    const heavy = estimateBody(profile({ heightCm: 165, weightKg: 80 }));
    expect(heavy.bust).toBeGreaterThan(light.bust);
    expect(heavy.waist).toBeGreaterThan(light.waist);
    expect(heavy.hip).toBeGreaterThan(light.hip);
  });

  it('applies optional body shape without requiring it', () => {
    const base = estimateBody(profile());
    const hourglass = estimateBody(profile({ bodyShape: 'hourglass' }));
    expect(hourglass.waist).toBeLessThan(base.waist);
    expect(hourglass.hip).toBeGreaterThan(base.hip);
  });
});

describe('recommendSize', () => {
  // 1. Average user -> mid size
  it('recommends M for an average body on a regular-fit dress', () => {
    const result = recommendSize(profile(), product());
    expect(result).not.toBeNull();
    expect(result!.recommendedSize).toBe('M');
    expect(result!.matchScore).toBeGreaterThanOrEqual(50);
    expect(result!.matchScore).toBeLessThanOrEqual(94);
  });

  // 2. Smaller user -> smaller size
  it('recommends a smaller size for a smaller body', () => {
    const average = recommendSize(profile(), product())!;
    const smaller = recommendSize(profile({ heightCm: 155, weightKg: 45 }), product())!;
    expect(indexOf(smaller.recommendedSize)).toBeLessThan(indexOf(average.recommendedSize));
  });

  // 3. Larger user -> larger size
  it('recommends a larger size for a larger body', () => {
    const average = recommendSize(profile(), product())!;
    const larger = recommendSize(profile({ heightCm: 170, weightKg: 85 }), product())!;
    expect(indexOf(larger.recommendedSize)).toBeGreaterThan(indexOf(average.recommendedSize));
  });

  // 4. Slim product -> size up
  it('sizes up on a slim-cut product', () => {
    const regular = recommendSize(profile(), product({ fitClass: 'regular' }))!;
    const slim = recommendSize(profile(), product({ fitClass: 'slim' }))!;
    expect(indexOf(slim.recommendedSize)).toBeGreaterThanOrEqual(indexOf(regular.recommendedSize));
    expect(slim.effectiveBody.bust).toBeGreaterThan(regular.effectiveBody.bust);
  });

  // 5. Relaxed product -> size down
  it('sizes down on a relaxed-cut product', () => {
    const regular = recommendSize(profile(), product({ fitClass: 'regular' }))!;
    const relaxed = recommendSize(profile(), product({ fitClass: 'relaxed' }))!;
    expect(indexOf(relaxed.recommendedSize)).toBeLessThanOrEqual(indexOf(regular.recommendedSize));
    expect(relaxed.effectiveBody.bust).toBeLessThan(regular.effectiveBody.bust);
  });

  // 6. Preferred slim fit -> tighter
  it('moves toward a smaller size when the shopper prefers a slim fit', () => {
    const regular = recommendSize(profile({ preferredFit: 'regular' }), product())!;
    const slim = recommendSize(profile({ preferredFit: 'slim' }), product())!;
    expect(slim.effectiveBody.waist).toBeLessThan(regular.effectiveBody.waist);
    expect(indexOf(slim.recommendedSize)).toBeLessThanOrEqual(indexOf(regular.recommendedSize));
  });

  // 7. Preferred relaxed fit -> roomier
  it('moves toward a larger size when the shopper prefers a relaxed fit', () => {
    const regular = recommendSize(profile({ preferredFit: 'regular' }), product())!;
    const relaxed = recommendSize(profile({ preferredFit: 'relaxed' }), product())!;
    expect(relaxed.effectiveBody.waist).toBeGreaterThan(regular.effectiveBody.waist);
    expect(indexOf(relaxed.recommendedSize)).toBeGreaterThanOrEqual(
      indexOf(regular.recommendedSize),
    );
  });

  // 8. Recommended size unavailable -> nearest available, with an explanation
  it('falls back to the nearest available size and says so', () => {
    const ideal = recommendSize(profile(), product())!;
    const constrained = recommendSize(
      profile(),
      product({ soldOutSizes: [ideal.recommendedSize] }),
    )!;

    expect(constrained.idealSize).toBe(ideal.recommendedSize);
    expect(constrained.recommendedSize).not.toBe(ideal.recommendedSize);
    expect(constrained.substitution).not.toBeNull();
    expect(constrained.substitution!.reason).toContain(ideal.recommendedSize);
    expect(constrained.substitution!.reason).toContain(constrained.recommendedSize);
  });

  // 9. Limited product sizes -> only recommend what exists
  it('only recommends from the sizes the product actually offers', () => {
    const limited = recommendSize(
      profile({ heightCm: 170, weightKg: 85 }),
      product({ sizes: ['XS', 'S'] }),
    )!;
    expect(['XS', 'S']).toContain(limited.recommendedSize);
    expect(limited.assessments).toHaveLength(2);
  });

  it('returns null when the product has no usable chart entries', () => {
    expect(recommendSize(profile(), product({ sizes: ['UK7'] }))).toBeNull();
  });

  it('reports every size as unavailable when nothing is in stock', () => {
    const result = recommendSize(
      profile(),
      product({ soldOutSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] }),
    )!;
    expect(result.substitution).not.toBeNull();
    expect(result.substitution!.reason).toContain('out of stock');
    expect(result.assessments.every((a) => !a.available)).toBe(true);
  });

  // 10. Saved profile reuse -> deterministic output
  it('is deterministic, so a saved profile reproduces the same recommendation', () => {
    const saved = profile({ heightCm: 168, weightKg: 64, preferredFit: 'relaxed' });
    const first = recommendSize(saved, product());
    const second = recommendSize({ ...saved }, product());
    expect(second).toEqual(first);
  });

  it('gives different sizes for different products to the same shopper', () => {
    const me = profile();
    const slimBrand = recommendSize(
      me,
      product({
        id: 'slim-dress',
        fitClass: 'slim',
        brandSizing: { label: 'Runs small', ease: -0.8, note: '' },
      }),
    )!;
    const relaxedBrand = recommendSize(
      me,
      product({
        id: 'relaxed-dress',
        fitClass: 'relaxed',
        brandSizing: { label: 'Runs large', ease: 0.4, note: '' },
      }),
    )!;
    expect(slimBrand.recommendedSize).not.toBe(relaxedBrand.recommendedSize);
    expect(indexOf(slimBrand.recommendedSize)).toBeGreaterThan(
      indexOf(relaxedBrand.recommendedSize),
    );
  });

  it('compensates for a brand that runs small by sizing up', () => {
    const trueToSize = recommendSize(profile(), product())!;
    const runsSmall = recommendSize(
      profile(),
      product({ brandSizing: { label: 'Runs small', ease: -1.2, note: '' } }),
    )!;
    expect(indexOf(runsSmall.recommendedSize)).toBeGreaterThanOrEqual(
      indexOf(trueToSize.recommendedSize),
    );
  });

  it('produces an assessment for every offered size, ordered as the product lists them', () => {
    const result = recommendSize(profile(), product())!;
    expect(result.assessments.map((a) => a.size)).toEqual(SIZE_ORDER);
    result.assessments.forEach((a) => {
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(100);
    });
  });

  it('never claims certainty', () => {
    const preferences: PreferredFit[] = ['slim', 'regular', 'relaxed'];
    preferences.forEach((preferredFit) => {
      const result = recommendSize(profile({ preferredFit }), product())!;
      expect(result.summary).toMatch(/should/);
      expect(result.summary).not.toMatch(/guarantee|perfect fit|100%|definitely/i);
    });
  });

  it('describes the match qualitatively, never as a percentage', () => {
    const bodies = [
      { heightCm: 150, weightKg: 42 },
      { heightCm: 165, weightKg: 60 },
      { heightCm: 178, weightKg: 90 },
    ];
    bodies.forEach((body) => {
      const result = recommendSize(profile(body), product())!;
      expect(['Strong match', 'Good match', 'Closest available size']).toContain(
        result.matchQuality,
      );
      // The shopper-facing strings must not carry a number.
      expect(result.matchQuality).not.toMatch(/\d/);
      expect(result.summary).not.toMatch(/\d+\s*%/);
    });
  });

  it('labels a substituted size as the closest available, not a strong match', () => {
    const ideal = recommendSize(profile(), product())!;
    const constrained = recommendSize(
      profile(),
      product({ soldOutSizes: [ideal.recommendedSize] }),
    )!;
    expect(constrained.matchQuality).toBe('Closest available size');
  });

  it('hints which way to go when the size will read snug or roomy', () => {
    // A body at the very top of the run has nothing bigger to move to.
    const large = recommendSize(profile({ heightCm: 175, weightKg: 100 }), product())!;
    expect(large.sizingHint === null || typeof large.sizingHint === 'string').toBe(true);

    const assessment = large.assessments.find((a) => a.size === large.recommendedSize)!;
    if (assessment.character === 'Snug' || assessment.character === 'Too tight') {
      expect(large.sizingHint).toBe('Consider sizing up');
    }
  });

  it('explains the decision in three groups without exposing the algorithm', () => {
    const result = recommendSize(
      profile({ preferredFit: 'relaxed' }),
      product({ fitClass: 'slim', brandSizing: { label: 'Runs small', ease: -0.8, note: '' } }),
    )!;

    const profileLabels = result.explanation.profile.map((r) => r.label);
    expect(profileLabels).toContain('Height');
    expect(profileLabels).toContain('Weight');
    expect(profileLabels).toContain('Preferred fit');

    const productLabels = result.explanation.product.map((r) => r.label);
    expect(productLabels).toContain('Fit');
    expect(productLabels).toContain('Brand sizing');

    // A slim cut, a relaxed preference and a brand that runs small all push up.
    const adjustments = result.explanation.adjustments;
    expect(adjustments.length).toBeGreaterThanOrEqual(3);
    adjustments.forEach((a) => expect(['up', 'down']).toContain(a.direction));
    expect(adjustments.find((a) => a.label === 'Product fit')!.direction).toBe('up');
    expect(adjustments.find((a) => a.label === 'Brand sizing')!.direction).toBe('up');

    expect(result.explanation.comparison).toContain(result.recommendedSize);
  });

  it('omits factors that did not move the recommendation', () => {
    const neutral = recommendSize(
      profile({ preferredFit: 'regular' }),
      product({ fitClass: 'regular', brandSizing: { label: 'True to size', ease: 0, note: '' } }),
    )!;
    expect(neutral.explanation.adjustments).toHaveLength(0);
  });

  it('flags when the shopper sits between two sizes', () => {
    // A body sitting exactly between two chart steps should tie.
    const between = recommendSize(profile({ heightCm: 165, weightKg: 66 }), product())!;
    const gap = Math.abs(
      between.assessments.filter((a) => a.available).sort((a, b) => a.distance - b.distance)[1]
        .distance - between.assessments.find((a) => a.size === between.recommendedSize)!.distance,
    );
    expect(between.betweenSizes).toBe(gap < 0.15);
  });
});
