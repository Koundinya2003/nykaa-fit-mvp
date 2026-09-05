import type { Product, Review } from '@/types';
import { PRODUCTS } from './products';

/* =========================================================================
   Reviews.

   Generated deterministically from the product id, so the same product always
   shows the same reviews and the catalogue and the review corpus can never
   drift apart.

   Two things are load-bearing here and were previously wrong:

   1. THE HISTOGRAM MUST RECONCILE WITH THE MEAN. The star distribution used
      to be derived by scaling up the 5-7 sampled reviews to the headline
      review count. With a sample that small, a product could — and wd-002
      did — put all 642 ratings in the 4-star bucket while displaying a 4.1
      average. Nobody trusts a store whose own arithmetic does not add up.
      The distribution is now solved for the displayed mean first, and the
      handful of shown reviews are sampled FROM that distribution, so the
      bars, the average and the listed reviews all describe one population.

   2. REVIEWERS MUST BE PLAUSIBLE FOR THE GARMENT. Names are drawn from a
      pool matching the product's gender, and sizes are drawn from the middle
      of the size run rather than uniformly, because that is where apparel
      demand actually sits.
   ========================================================================= */

/** Split by gender so a women's bodycon dress is not reviewed by "Rohan M."
 *  Unisex products draw from both. */
const FEMALE_NAMES = [
  'Ananya R.', 'Priya S.', 'Sneha K.', 'Meera J.', 'Divya P.', 'Nandini B.',
  'Ritika D.', 'Tanvi C.', 'Pooja L.', 'Neha W.', 'Shruti M.', 'Kavya B.',
  'Aishwarya N.', 'Lakshmi V.', 'Ishita G.',
];

const MALE_NAMES = [
  'Rohan M.', 'Aditya V.', 'Karthik N.', 'Ishaan G.', 'Arjun T.', 'Sahil A.',
  'Vikram H.', 'Rahul E.', 'Nikhil P.', 'Siddharth R.', 'Manav K.', 'Varun D.',
];

function namePoolFor(product: Product): string[] {
  if (product.gender === 'women') return FEMALE_NAMES;
  if (product.gender === 'men') return MALE_NAMES;
  return [...FEMALE_NAMES, ...MALE_NAMES];
}

const POSITIVE: { title: string; body: string }[] = [
  {
    title: 'Exactly as pictured',
    body: 'Fabric quality is genuinely good for the price and the colour matches the photos closely. Washed it once and it held up fine.',
  },
  {
    title: 'Worth every rupee',
    body: 'Ordered on a sale price and it feels far more expensive than what I paid. Stitching is neat throughout, no loose threads anywhere.',
  },
  {
    title: 'Very comfortable',
    body: 'Wore it for a full day and it stayed comfortable. Breathable material, and the cut does not ride up when you move around.',
  },
  {
    title: 'Great buy',
    body: 'Delivery was quick and the packaging was sealed properly. The finish is clean and it looks well made in person.',
  },
  {
    title: 'Repeat purchase',
    body: 'This is my second one in a different colour. Consistent quality both times, which is rare at this price point.',
  },
];

const MIXED: { title: string; body: string }[] = [
  {
    title: 'Good, but check the sizing',
    body: 'Quality is fine and I like the colour, but the sizing is not consistent with other brands I own. Refer to the size chart before ordering.',
  },
  {
    title: 'Decent for the price',
    body: 'Nothing wrong with it, though the fabric is lighter than I expected from the description. Fine for regular wear.',
  },
  {
    title: 'Nice, minor issues',
    body: 'Looks good and fits well overall. The colour is slightly different from the listing photos under indoor light.',
  },
];

const NEGATIVE: { title: string; body: string }[] = [
  {
    title: 'Had to exchange',
    body: 'The first one I received did not fit as expected, so I exchanged it for a size up. The exchange itself was smooth.',
  },
  {
    title: 'Not for me',
    body: 'Material is acceptable but the cut did not work on my body type. Returned it without any trouble.',
  },
];

/** Small deterministic PRNG (mulberry32) seeded from the product id. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIT_FEEDBACK: Review['fitFeedback'][] = ['Runs small', 'True to size', 'Runs large'];

/**
 * Fit feedback correlated with how the brand actually cuts.
 *
 * This was previously a uniform draw over the three labels, which is a third
 * inconsistency of the same family as the histogram: a brand whose own
 * garments run small had a third of its reviewers reporting it runs large.
 * Averaged over a brand that produces no signal at all, which makes the
 * cross-brand comparison — the strongest claim the feature makes — rest on
 * nothing.
 *
 * Reviewers now mostly agree with the brand's behaviour and sometimes do
 * not, which is what a real corpus looks like and what makes the derived
 * per-brand consistency score meaningful rather than decorative.
 *
 * Rows are P(runs small), P(true to size), P(runs large).
 */
const FIT_FEEDBACK_MIX: Record<string, [number, number, number]> = {
  'Runs small': [0.62, 0.28, 0.1],
  'True to size': [0.18, 0.64, 0.18],
  'Runs large': [0.1, 0.28, 0.62],
};

function sampleFitFeedback(product: Product, r: number): Review['fitFeedback'] {
  const mix = FIT_FEEDBACK_MIX[product.brandSizing?.label ?? 'True to size'];
  let acc = 0;
  for (let i = 0; i < mix.length; i += 1) {
    acc += mix[i];
    if (r <= acc) return FIT_FEEDBACK[i];
  }
  return 'True to size';
}

/* -------------------------------------------------------------------------
   The star histogram.
   ------------------------------------------------------------------------- */

/** Weighted mean of a 5-bucket histogram (index 0 = 1 star). */
export function meanOf(buckets: number[]): number {
  const total = buckets.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return buckets.reduce((acc, n, i) => acc + n * (i + 1), 0) / total;
}

/** Largest-remainder apportionment: turns proportions into integers that sum
 *  exactly to `total`, without the rounding drift a naive round() leaves. */
function apportion(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (w / sum) * total);
  const counts = exact.map(Math.floor);
  let remaining = total - counts.reduce((a, b) => a + b, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; remaining > 0; k += 1, remaining -= 1) {
    counts[order[k % order.length].i] += 1;
  }
  return counts;
}

/**
 * A star distribution that actually averages to the product's headline
 * rating.
 *
 * Starts from a Gaussian centred on the rating — the shape real rating
 * distributions have, with a small floor so low scores still appear — then
 * corrects it. Each correction moves one rating one bucket, which changes the
 * total by exactly one star, so the mean can be walked onto the target rather
 * than approximated. The loop is bounded; if it cannot converge (a 4.9 on a
 * handful of ratings, say) it stops at the closest achievable distribution
 * rather than spinning.
 */
export function solveDistribution(rating: number, total: number): number[] {
  if (total <= 0) return [0, 0, 0, 0, 0];

  const weights = [1, 2, 3, 4, 5].map(
    (star) => Math.exp(-((star - rating) ** 2) / (2 * 0.7 ** 2)) + 0.04,
  );
  const counts = apportion(weights, total);

  // Star-units we need to add (positive) or remove (negative) to hit the mean.
  const target = Math.round(rating * total);
  let delta = target - counts.reduce((acc, n, i) => acc + n * (i + 1), 0);

  const maxSteps = total * 4;
  for (let step = 0; delta !== 0 && step < maxSteps; step += 1) {
    if (delta > 0) {
      // Promote one rating from the highest non-empty bucket below 5.
      const from = findFrom(counts, 3, -1, -1);
      if (from === -1) break;
      counts[from] -= 1;
      counts[from + 1] += 1;
      delta -= 1;
    } else {
      // Demote one from the lowest non-empty bucket above 1.
      const from = findFrom(counts, 1, 5, 1);
      if (from === -1) break;
      counts[from] -= 1;
      counts[from - 1] += 1;
      delta += 1;
    }
  }

  return counts;
}

/** First index in [start, end) stepping by `step` whose bucket is non-empty. */
function findFrom(counts: number[], start: number, end: number, step: number): number {
  for (let i = start; i !== end; i += step) {
    if (counts[i] > 0) return i;
  }
  return -1;
}

/* -------------------------------------------------------------------------
   The listed reviews.
   ------------------------------------------------------------------------- */

/** Picks copy that has not been used yet for this product, so a single
 *  product never shows the same review text twice. */
function pickCopy(
  pool: { title: string; body: string }[],
  used: Set<string>,
  r: number,
): { title: string; body: string } {
  const fresh = pool.filter((c) => !used.has(c.title));
  const from = fresh.length > 0 ? fresh : pool;
  const choice = from[Math.floor(r * from.length) % from.length];
  used.add(choice.title);
  return choice;
}

/**
 * Draws a star value from the product's own distribution, so the reviews on
 * screen are a sample of the population the bars describe rather than an
 * independent second opinion.
 */
function sampleFromDistribution(distribution: number[], r: number): number {
  const total = distribution.reduce((a, b) => a + b, 0);
  if (total === 0) return 5;
  let acc = 0;
  const targetValue = r * total;
  for (let i = 0; i < distribution.length; i += 1) {
    acc += distribution[i];
    if (targetValue <= acc) return i + 1;
  }
  return 5;
}

/**
 * Sizes are drawn from the middle of the run, not uniformly.
 *
 * Apparel demand is concentrated on the middle sizes, so a uniform draw
 * produces a review set skewed toward the extremes of the run — which reads
 * as invented, and is why a women's bodycon midi was showing XL reviews at
 * the same rate as M.
 */
function sampleSize(sizes: string[], r: number): string {
  if (sizes.length === 0) return '';
  const mid = (sizes.length - 1) / 2;
  // Triangular weights, peaking in the middle of the available run.
  const weights = sizes.map((_, i) => 1 + (mid - Math.abs(i - mid)) * 1.6);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const target = r * total;
  for (let i = 0; i < weights.length; i += 1) {
    acc += weights[i];
    if (target <= acc) return sizes[i];
  }
  return sizes[sizes.length - 1];
}

function buildReviews(product: Product, distribution: number[]): Review[] {
  const rand = seededRandom(product.id);
  const count = 5 + Math.floor(rand() * 3); // 5–7 reviews
  const reviews: Review[] = [];
  const usedCopy = new Set<string>();
  const usedNames = new Set<string>();
  const names = namePoolFor(product);
  const sizes = product.sizes.filter((s) => !product.soldOutSizes.includes(s));

  for (let i = 0; i < count; i += 1) {
    const stars = sampleFromDistribution(distribution, rand());
    const pool = stars >= 4 ? POSITIVE : stars === 3 ? MIXED : NEGATIVE;
    const copy = pickCopy(pool, usedCopy, rand());
    const monthsAgo = 1 + Math.floor(rand() * 10);
    const date = new Date(2026, 8 - monthsAgo, 3 + Math.floor(rand() * 24));

    // Distinct reviewer per product.
    let author = names[Math.floor(rand() * names.length)];
    for (let n = 0; usedNames.has(author) && n < names.length; n += 1) {
      author = names[(names.indexOf(author) + 1) % names.length];
    }
    usedNames.add(author);

    reviews.push({
      id: `${product.id}-r${i}`,
      productId: product.id,
      author,
      rating: stars,
      title: copy.title,
      body: copy.body,
      date: date.toISOString().slice(0, 10),
      verified: rand() > 0.25,
      fitFeedback: sampleFitFeedback(product, rand()),
      sizeBought: sampleSize(sizes, rand()) || product.sizes[0],
    });
  }

  return reviews.sort((a, b) => b.date.localeCompare(a.date));
}

const DISTRIBUTION_BY_PRODUCT = new Map<string, number[]>(
  PRODUCTS.map((p) => [p.id, solveDistribution(p.rating, p.reviewCount)]),
);

const REVIEWS_BY_PRODUCT = new Map<string, Review[]>(
  PRODUCTS.map((p) => [p.id, buildReviews(p, DISTRIBUTION_BY_PRODUCT.get(p.id)!)]),
);

export function getReviews(productId: string): Review[] {
  return REVIEWS_BY_PRODUCT.get(productId) ?? [];
}

/** Star histogram (index 0 = 1 star … index 4 = 5 stars). Sums to the
 *  product's headline review count and averages to its headline rating. */
export function getRatingBreakdown(product: Product): number[] {
  return DISTRIBUTION_BY_PRODUCT.get(product.id) ?? solveDistribution(product.rating, product.reviewCount);
}

/** Aggregate fit sentiment — the signal the brand fit history builds on. */
export function getFitSentiment(productId: string): {
  label: Review['fitFeedback'];
  share: number;
}[] {
  const reviews = getReviews(productId);
  if (reviews.length === 0) return [];
  const counts = new Map<Review['fitFeedback'], number>();
  reviews.forEach((r) => counts.set(r.fitFeedback, (counts.get(r.fitFeedback) ?? 0) + 1));
  return [...counts.entries()]
    .map(([label, n]) => ({ label, share: Math.round((n / reviews.length) * 100) }))
    .sort((a, b) => b.share - a.share);
}
