import type { BodyMeasurements, BrandSizing, FitType, FitClass, ProductSizeChart } from '@/types';

/* =========================================================================
   Brand-level sizing data.

   Two separate things are modelled here, because in the real world they are
   separate:

   1. The brand's published SIZE CHART — the body each size is cut for.
      Brands genuinely disagree: a Kazo "M" is cut for a smaller body than a
      W for Woman "M". This is the reference the engine measures against.

   2. BRAND SIZING behaviour — how the finished garment turns out relative to
      that published chart ("runs small"). A brand can publish an accurate
      chart and still sew tight. This is a correction applied on top.

   Charts are expressed as a block (the measurements at size S) plus a grade
   (inches added per size step), which is how apparel size sets are actually
   built and keeps the data readable.
   ========================================================================= */

interface BrandChartSpec {
  /** Measurements the brand cuts its size S for, in inches. */
  block: BodyMeasurements;
  /** Inches added per step up the size run. */
  grade: BodyMeasurements;
  sizing: BrandSizing;
}

const RUNS_SMALL = (ease: number, note: string): BrandSizing => ({
  label: 'Runs small',
  ease,
  note,
});
const TRUE_TO_SIZE = (ease: number, note: string): BrandSizing => ({
  label: 'True to size',
  ease,
  note,
});
const RUNS_LARGE = (ease: number, note: string): BrandSizing => ({
  label: 'Runs large',
  ease,
  note,
});

const BRAND_CHARTS: Record<string, BrandChartSpec> = {
  Libas: {
    block: { bust: 34.5, waist: 28.5, hip: 37 },
    grade: { bust: 2, waist: 2, hip: 2 },
    sizing: RUNS_LARGE(0.5, 'Libas ethnic silhouettes are cut with extra room through the body.'),
  },
  'Vero Moda': {
    block: { bust: 33.5, waist: 27, hip: 36 },
    grade: { bust: 2, waist: 2, hip: 2 },
    sizing: RUNS_SMALL(-0.6, 'European sizing — most shoppers size up one from their usual Indian size.'),
  },
  AND: {
    block: { bust: 34, waist: 28, hip: 36.5 },
    grade: { bust: 2, waist: 2, hip: 2 },
    sizing: TRUE_TO_SIZE(0, 'AND cuts close to its published chart.'),
  },
  'Global Desi': {
    block: { bust: 34.5, waist: 29, hip: 37 },
    grade: { bust: 2, waist: 2, hip: 2 },
    sizing: RUNS_LARGE(0.4, 'Boho cuts are drafted loose through the waist.'),
  },
  ONLY: {
    block: { bust: 33.5, waist: 27, hip: 36 },
    grade: { bust: 1.75, waist: 1.75, hip: 2 },
    sizing: RUNS_SMALL(-0.5, 'European sizing with a tighter grade between sizes.'),
  },
  'Twenty Dresses': {
    block: { bust: 33, waist: 26.5, hip: 35.5 },
    grade: { bust: 2, waist: 2, hip: 2 },
    sizing: RUNS_SMALL(-0.7, 'Party styles are cut lean; reviewers commonly size up.'),
  },
  Biba: {
    block: { bust: 34, waist: 28.5, hip: 36.5 },
    grade: { bust: 2, waist: 2, hip: 2 },
    sizing: TRUE_TO_SIZE(0.2, 'Biba runs close to its chart, with a little ease at the waist.'),
  },
  Sangria: {
    block: { bust: 34, waist: 28, hip: 36.5 },
    grade: { bust: 2, waist: 2, hip: 2 },
    sizing: TRUE_TO_SIZE(0, 'Sangria cuts to a standard Indian block.'),
  },
  Kazo: {
    block: { bust: 32.5, waist: 26, hip: 35 },
    grade: { bust: 2, waist: 2, hip: 2 },
    sizing: RUNS_SMALL(-0.8, 'Kazo drafts to a notably slim block — size up for comfort.'),
  },
  'W for Woman': {
    block: { bust: 35, waist: 29.5, hip: 37.5 },
    grade: { bust: 2, waist: 2, hip: 2 },
    sizing: RUNS_LARGE(0.6, 'W is drafted for everyday comfort with generous ease.'),
  },
};

/** Index of size S within a standard apparel run. */
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function hasBrandChart(brand: string): boolean {
  return brand in BRAND_CHARTS;
}

export function getBrandSizing(brand: string): BrandSizing | undefined {
  return BRAND_CHARTS[brand]?.sizing;
}

/** Expands a brand's block + grade into a full chart over the sizes a product
 *  actually offers. Returns undefined for brands with no chart on file, which
 *  is how a product opts out of Nykaa Fit. */
export function buildSizeChart(brand: string, sizes: string[]): ProductSizeChart | undefined {
  const spec = BRAND_CHARTS[brand];
  if (!spec) return undefined;

  const sIndex = SIZE_ORDER.indexOf('S');
  const chart: ProductSizeChart = {};

  sizes.forEach((size) => {
    const idx = SIZE_ORDER.indexOf(size);
    if (idx === -1) return; // Non-apparel run (waist inches, UK shoe) — skip.
    const step = idx - sIndex;
    chart[size] = {
      bust: round(spec.block.bust + spec.grade.bust * step),
      waist: round(spec.block.waist + spec.grade.waist * step),
      hip: round(spec.block.hip + spec.grade.hip * step),
    };
  });

  return Object.keys(chart).length > 0 ? chart : undefined;
}

function round(n: number): number {
  return Math.round(n * 2) / 2; // Charts are published to the half inch.
}

/** Marketing fit label -> the class the engine reasons about. */
export function toFitClass(fit: FitType): FitClass {
  switch (fit) {
    case 'Bodycon':
    case 'Slim Fit':
    case 'Skinny':
      return 'slim';
    case 'Relaxed Fit':
    case 'Boyfriend':
      return 'relaxed';
    case 'Oversized':
      return 'oversized';
    case 'A-Line':
    case 'Regular Fit':
    case 'Straight':
    case 'True to Size':
    default:
      return 'regular';
  }
}
