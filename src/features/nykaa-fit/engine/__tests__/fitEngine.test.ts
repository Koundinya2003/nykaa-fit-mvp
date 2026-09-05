import { describe, expect, it } from 'vitest';
import type { FitProductInput, FitProfile, PartialMeasurements } from '../../types/fitTypes';
import { recommendSize } from '../fitEngine';
import { easeTargetFor, providedKeys, weightsFor, CUT_EASE, PREFERENCE_EASE } from '../scoring';
import { assessConfidence } from '../confidence';

/* =========================================================================
   The engine takes two inputs and nothing else: the measurements the
   shopper gave, and the brand's published chart. These tests exist mostly
   to hold that line — several of them would pass just as well against a
   model that quietly consulted something else, so the ones that matter
   most are the exclusion tests at the bottom.
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
    ...overrides,
  };
}

function profile(
  measurements: PartialMeasurements,
  overrides: Partial<FitProfile> = {},
): FitProfile {
  return {
    measurements,
    preferredFit: 'regular',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

/** A body sitting squarely on the M row of the chart above. */
const ON_M = { bust: 36, waist: 30, hip: 38.5 };
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const indexOf = (size: string) => SIZE_ORDER.indexOf(size);

describe('measurement handling', () => {
  it('uses the measurements it is given, verbatim', () => {
    const result = recommendSize(profile(ON_M), product())!;
    expect(result.body).toEqual(ON_M);
    expect(result.recommendedSize).toBe('M');
  });

  it('works from a single measurement', () => {
    const result = recommendSize(profile({ waist: 30 }), product())!;
    expect(result).not.toBeNull();
    expect(providedKeys(result.body)).toEqual(['waist']);
  });

  it('leaves skipped measurements null rather than filling them in', () => {
    const result = recommendSize(profile({ waist: 30 }), product())!;
    const m = result.assessments.find((a) => a.size === 'M')!;
    const bust = m.comparisons.find((c) => c.key === 'bust')!;
    expect(bust.yours).toBeNull();
    expect(bust.ease).toBeNull();
    expect(bust.verdict).toBeNull();
    // The chart value is still shown — that is public product information.
    expect(bust.chart).toBe(36);
  });

  it('returns nothing at all when no measurement was given', () => {
    expect(recommendSize(profile({}), product())).toBeNull();
  });

  it('renormalises the weights over whatever was provided', () => {
    expect(Object.values(weightsFor(['bust', 'waist', 'hip'])).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(Object.values(weightsFor(['waist'])).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(weightsFor(['waist']).waist).toBe(1);
    expect(weightsFor([])).toEqual({});
  });

  it('scores a partial body only on what it knows', () => {
    // A bust that is wildly wrong must not affect a waist-only profile.
    const waistOnly = recommendSize(profile({ waist: 30 }), product())!;
    const withBadBust = recommendSize(profile({ waist: 30, bust: 48 }), product())!;
    expect(waistOnly.recommendedSize).toBe('M');
    expect(withBadBust.recommendedSize).not.toBe('M');
  });
});

describe('sizing behaviour', () => {
  it('recommends a smaller size for a smaller body', () => {
    const avg = recommendSize(profile(ON_M), product())!;
    const small = recommendSize(profile({ bust: 32, waist: 26, hip: 34.5 }), product())!;
    expect(indexOf(small.recommendedSize)).toBeLessThan(indexOf(avg.recommendedSize));
  });

  it('recommends a larger size for a larger body', () => {
    const avg = recommendSize(profile(ON_M), product())!;
    const large = recommendSize(profile({ bust: 40, waist: 34, hip: 42.5 }), product())!;
    expect(indexOf(large.recommendedSize)).toBeGreaterThan(indexOf(avg.recommendedSize));
  });

  it('sizes up on a close-fitting cut and down on a relaxed one', () => {
    const regular = recommendSize(profile(ON_M), product({ fitClass: 'regular' }))!;
    const slim = recommendSize(profile(ON_M), product({ fitClass: 'slim' }))!;
    const relaxed = recommendSize(profile(ON_M), product({ fitClass: 'relaxed' }))!;
    expect(indexOf(slim.recommendedSize)).toBeGreaterThanOrEqual(indexOf(regular.recommendedSize));
    expect(indexOf(relaxed.recommendedSize)).toBeLessThanOrEqual(indexOf(regular.recommendedSize));
  });

  it('responds to the shopper changing her preferred fit', () => {
    const slim = recommendSize(profile(ON_M, { preferredFit: 'slim' }), product())!;
    const regular = recommendSize(profile(ON_M, { preferredFit: 'regular' }), product())!;
    const relaxed = recommendSize(profile(ON_M, { preferredFit: 'relaxed' }), product())!;
    expect(slim.easeTarget).toBeLessThan(regular.easeTarget);
    expect(relaxed.easeTarget).toBeGreaterThan(regular.easeTarget);
    expect(indexOf(relaxed.recommendedSize)).toBeGreaterThanOrEqual(indexOf(slim.recommendedSize));
  });

  it('composes the ease target from exactly the cut and the preference', () => {
    expect(easeTargetFor('slim', 'relaxed')).toBeCloseTo(CUT_EASE.slim + PREFERENCE_EASE.relaxed, 6);
    expect(easeTargetFor('regular', 'regular')).toBe(0);
  });

  it('falls back to the nearest available size and says so', () => {
    const ideal = recommendSize(profile(ON_M), product())!;
    const constrained = recommendSize(
      profile(ON_M),
      product({ soldOutSizes: [ideal.recommendedSize] }),
    )!;
    expect(constrained.idealSize).toBe(ideal.recommendedSize);
    expect(constrained.recommendedSize).not.toBe(ideal.recommendedSize);
    expect(constrained.substitution!.reason).toContain(ideal.recommendedSize);
  });

  it('only recommends sizes the product actually offers', () => {
    const limited = recommendSize(profile({ bust: 44, waist: 38, hip: 46 }), product({ sizes: ['XS', 'S'] }))!;
    expect(['XS', 'S']).toContain(limited.recommendedSize);
    expect(limited.assessments).toHaveLength(2);
  });

  it('returns null when the product has no usable chart entries', () => {
    expect(recommendSize(profile(ON_M), product({ sizes: ['UK7'] }))).toBeNull();
  });

  it('is deterministic', () => {
    const me = profile(ON_M);
    expect(recommendSize(me, product())).toEqual(recommendSize({ ...me }, product()));
  });

  it('gives the same body different sizes on brands that publish different charts', () => {
    // Two brands, same shopper, charts offset by a full size.
    const shifted = Object.fromEntries(
      Object.entries(CHART).map(([size, m]) => [
        size,
        { bust: m.bust + 2, waist: m.waist + 2, hip: m.hip + 2 },
      ]),
    );
    const a = recommendSize(profile(ON_M), product({ id: 'a' }))!;
    const b = recommendSize(profile(ON_M), product({ id: 'b', sizeChart: shifted }))!;
    expect(a.recommendedSize).not.toBe(b.recommendedSize);
  });
});

describe('confidence and withholding', () => {
  it('reaches high confidence on three measurements that land cleanly', () => {
    const result = recommendSize(profile(ON_M), product())!;
    expect(result.confidence.level).toBe('high');
    expect(result.confidence.withheld).toBe(false);
    expect(result.confidence.limitingFactor).toBeNull();
  });

  it('rates a one-measurement profile below a three-measurement one', () => {
    const full = recommendSize(profile(ON_M), product())!;
    const partial = recommendSize(profile({ waist: 30 }), product())!;
    expect(partial.confidence.components.completeness).toBeLessThan(
      full.confidence.components.completeness,
    );
    expect(partial.confidence.score).toBeLessThan(full.confidence.score);
  });

  it('names the missing measurements and asks for them', () => {
    const partial = recommendSize(profile({ waist: 30 }), product())!;
    expect(partial.confidence.missing.sort()).toEqual(['bust', 'hip']);
    if (partial.confidence.limitingFactor) {
      expect(partial.confidence.limitingFactor).toMatch(/bust|hip/);
    }
  });

  it('withholds when the shopper sits exactly between two sizes', () => {
    // Halfway between the S and M rows on every measurement.
    const between = recommendSize(profile({ bust: 35, waist: 29, hip: 37.5 }), product())!;
    expect(between.confidence.components.separation).toBeLessThan(0.2);
    expect(between.confidence.withheld).toBe(true);
    expect(between.summary).toMatch(/not confident enough/i);
    expect(between.summary).toMatch(/size chart/i);
  });

  it('names no size in the summary when it is withholding', () => {
    const between = recommendSize(profile({ bust: 35, waist: 29, hip: 37.5 }), product())!;
    SIZE_ORDER.forEach((size) => {
      expect(between.summary).not.toMatch(new RegExp(`\\b${size}\\b`));
    });
    // ...but keeps the pick internally so the decision stays auditable.
    expect(SIZE_ORDER).toContain(between.recommendedSize);
  });

  it('lowers confidence when the size had to be substituted', () => {
    const clean = recommendSize(profile(ON_M), product())!;
    const substituted = recommendSize(profile(ON_M), product({ soldOutSizes: ['M'] }))!;
    expect(substituted.confidence.score).toBeLessThan(clean.confidence.score);
  });

  it('keeps every level and score inside its stated range', () => {
    [{ bust: 30 }, { waist: 33 }, ON_M, { bust: 44, waist: 38, hip: 46 }].forEach((m) => {
      const r = recommendSize(profile(m), product())!;
      expect(['high', 'medium', 'low']).toContain(r.confidence.level);
      expect(r.confidence.score).toBeGreaterThanOrEqual(0);
      expect(r.confidence.score).toBeLessThanOrEqual(1);
      expect(r.confidence.withheld).toBe(r.confidence.level === 'low');
    });
  });

  it('never claims certainty or prints a percentage', () => {
    const r = recommendSize(profile(ON_M), product())!;
    expect(r.summary).not.toMatch(/guarantee|perfect fit|100%|definitely/i);
    expect(r.summary).not.toMatch(/\d+\s*%/);
  });

  it('has no term standing in for data we do not hold', () => {
    const c = assessConfidence({
      body: ON_M,
      bestDistance: 0,
      runnerUpDistance: 2,
      substituted: false,
    });
    // Every component must be traceable to the shopper or the chart.
    expect(Object.keys(c.components).sort()).toEqual(['closeness', 'completeness', 'separation']);
  });
});

describe('the receipt', () => {
  it('lists every measurement that was used, with its value', () => {
    const r = recommendSize(profile(ON_M), product())!;
    const labels = r.receipt.inputsUsed.map((i) => i.label);
    expect(labels).toContain('Your bust');
    expect(labels).toContain('Your waist');
    expect(labels).toContain('Your hip');
    expect(r.receipt.inputsUsed.find((i) => i.label === 'Your bust')!.value).toBe('36″');
  });

  it('declares what was missing rather than hiding it', () => {
    const r = recommendSize(profile({ waist: 30 }), product())!;
    expect(r.receipt.inputsMissing).toHaveLength(2);
    r.receipt.inputsMissing.forEach((row) => {
      expect(row.value).toMatch(/not estimated/i);
    });
  });

  it('shows the ease target broken into the parts that produced it', () => {
    const r = recommendSize(profile(ON_M, { preferredFit: 'relaxed' }), product({ fitClass: 'slim' }))!;
    const summed = r.receipt.easeTarget.parts.reduce((acc, p) => acc + p.inches, 0);
    expect(summed).toBeCloseTo(r.receipt.easeTarget.total, 6);
    expect(r.receipt.easeTarget.total).toBeCloseTo(r.easeTarget, 6);
  });

  it('omits ease parts that contributed nothing', () => {
    const r = recommendSize(profile(ON_M), product({ fitClass: 'regular' }))!;
    expect(r.receipt.easeTarget.parts).toHaveLength(0);
    expect(r.easeTarget).toBe(0);
  });

  it('states what was deliberately excluded', () => {
    const r = recommendSize(profile(ON_M), product())!;
    const excluded = r.receipt.notUsed.join(' ').toLowerCase();
    expect(excluded).toContain('review');
    expect(excluded).toContain('estimate');
  });
});

describe('advice is never arithmetic', () => {
  const RUNS_SMALL = { label: 'Runs small', note: 'Cut lean through the body.' };

  it('does not let a brand note move the recommended size', () => {
    const plain = recommendSize(profile(ON_M), product())!;
    const noted = recommendSize(profile(ON_M), product({ brandSizing: RUNS_SMALL }))!;
    expect(noted.recommendedSize).toBe(plain.recommendedSize);
    expect(noted.easeTarget).toBe(plain.easeTarget);
  });

  it('surfaces the brand note as something to weigh instead', () => {
    const noted = recommendSize(profile(ON_M), product({ brandSizing: RUNS_SMALL }))!;
    const note = noted.notes.find((n) => n.id === 'brand-sizing')!;
    expect(note.source).toBe('brand');
    expect(note.direction).toBe('up');
    expect(note.body).toMatch(/context/i);
  });

  it('says nothing when the brand claims to be true to size', () => {
    const r = recommendSize(
      profile(ON_M),
      product({ brandSizing: { label: 'True to size', note: '' } }),
    )!;
    expect(r.notes).toHaveLength(0);
  });

  it('passes the shopper own notes through without applying them', () => {
    const personal = [
      { id: 'you-returns', source: 'you' as const, label: 'x', body: 'y', direction: 'up' as const },
    ];
    const plain = recommendSize(profile(ON_M), product())!;
    const withNotes = recommendSize(profile(ON_M), product(), personal)!;
    expect(withNotes.recommendedSize).toBe(plain.recommendedSize);
    expect(withNotes.notes).toContainEqual(personal[0]);
  });
});
