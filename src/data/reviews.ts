import type { Product, Review } from '@/types';
import { PRODUCTS } from './products';

/* Reviews are generated deterministically from the product id so that the
   same product always shows the same reviews, the star distribution roughly
   matches the product's headline rating, and the set stays in sync when the
   catalogue changes. Copy is drawn from hand-written pools per sentiment. */

const NAMES = [
  'Ananya R.', 'Priya S.', 'Rohan M.', 'Sneha K.', 'Aditya V.', 'Meera J.',
  'Karthik N.', 'Divya P.', 'Ishaan G.', 'Nandini B.', 'Arjun T.', 'Ritika D.',
  'Sahil A.', 'Tanvi C.', 'Vikram H.', 'Pooja L.', 'Neha W.', 'Rahul E.',
];

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

/** Star value sampled from a Gaussian centred on the product's headline
 *  rating, with a small floor so low scores still appear. Without this every
 *  well-rated product would show a 4/5-only histogram, which reads as fake. */
function sampleStars(rating: number, r: number): number {
  const weights = [1, 2, 3, 4, 5].map(
    (star) => Math.exp(-((star - rating) ** 2) / (2 * 0.7 ** 2)) + 0.04,
  );
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const target = r * total;
  for (let i = 0; i < weights.length; i += 1) {
    acc += weights[i];
    if (target <= acc) return i + 1;
  }
  return 5;
}

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

function buildReviews(product: Product): Review[] {
  const rand = seededRandom(product.id);
  const count = 5 + Math.floor(rand() * 3); // 5–7 reviews
  const reviews: Review[] = [];
  const usedCopy = new Set<string>();
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    const stars = sampleStars(product.rating, rand());
    const pool = stars >= 4 ? POSITIVE : stars === 3 ? MIXED : NEGATIVE;
    const copy = pickCopy(pool, usedCopy, rand());
    const monthsAgo = 1 + Math.floor(rand() * 10);
    const date = new Date(2026, 8 - monthsAgo, 3 + Math.floor(rand() * 24));
    const sizes = product.sizes.filter((s) => !product.soldOutSizes.includes(s));

    // Distinct reviewer per product.
    let author = NAMES[Math.floor(rand() * NAMES.length)];
    for (let n = 0; usedNames.has(author) && n < NAMES.length; n += 1) {
      author = NAMES[(NAMES.indexOf(author) + 1) % NAMES.length];
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
      fitFeedback: FIT_FEEDBACK[Math.floor(rand() * FIT_FEEDBACK.length)],
      sizeBought: sizes[Math.floor(rand() * sizes.length)] ?? product.sizes[0],
    });
  }

  return reviews.sort((a, b) => b.date.localeCompare(a.date));
}

const REVIEWS_BY_PRODUCT = new Map<string, Review[]>(
  PRODUCTS.map((p) => [p.id, buildReviews(p)]),
);

export function getReviews(productId: string): Review[] {
  return REVIEWS_BY_PRODUCT.get(productId) ?? [];
}

/** Star histogram (index 0 = 1 star … index 4 = 5 stars), scaled up to the
 *  product's headline review count so the bars match the displayed total. */
export function getRatingBreakdown(product: Product): number[] {
  const reviews = getReviews(product.id);
  const buckets = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    buckets[r.rating - 1] += 1;
  });
  const sampled = reviews.length || 1;
  return buckets.map((n) => Math.round((n / sampled) * product.reviewCount));
}

/** Aggregate fit sentiment — the signal Nykaa Fit will build on later. */
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
