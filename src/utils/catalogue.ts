import type { FilterState, Product, SortId, SubcategoryId } from '@/types';
import { COLOR_FAMILIES } from '@/data/palette';
import { COLOR_LABEL } from '@/data/palette';

export const EMPTY_FILTERS: FilterState = {
  brands: [],
  sizes: [],
  colors: [],
  priceMin: null,
  priceMax: null,
  minDiscount: null,
  minRating: null,
  subcategories: [],
};

export const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'popularity', label: 'Popularity' },
  { id: 'newest', label: 'Newest First' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'discount', label: 'Discount' },
  { id: 'rating', label: 'Customer Rating' },
];

/** Colour-family label -> the specific colour names that roll up into it. */
const FAMILY_TO_NAMES = new Map<string, Set<string>>(
  COLOR_FAMILIES.map((f) => [f.label, new Set(f.members.map((m) => COLOR_LABEL[m]))]),
);

export function matchesColorFamily(product: Product, familyLabel: string): boolean {
  const names = FAMILY_TO_NAMES.get(familyLabel);
  if (!names) return false;
  return product.colors.some((c) => names.has(c.name));
}

/** A product satisfies a facet if it matches at least one selected value in
 *  that facet (OR within a facet), and every active facet (AND across them). */
export function applyFilters(products: Product[], f: FilterState): Product[] {
  return products.filter((p) => {
    if (f.brands.length && !f.brands.includes(p.brand)) return false;
    if (f.subcategories.length && !f.subcategories.includes(p.subcategory)) return false;
    if (f.sizes.length && !p.sizes.some((s) => f.sizes.includes(s) && !p.soldOutSizes.includes(s)))
      return false;
    if (f.colors.length && !f.colors.some((c) => matchesColorFamily(p, c))) return false;
    if (f.priceMin !== null && p.price < f.priceMin) return false;
    if (f.priceMax !== null && p.price > f.priceMax) return false;
    if (f.minDiscount !== null && p.discount < f.minDiscount) return false;
    if (f.minRating !== null && p.rating < f.minRating) return false;
    return true;
  });
}

/** "Recommended" blends rating and review volume so the default order is not
 *  simply catalogue order — everything else sorts on a single field. */
export function applySort(products: Product[], sort: SortId): Product[] {
  const list = [...products];
  switch (sort) {
    case 'popularity':
      return list.sort((a, b) => b.reviewCount - a.reviewCount);
    case 'newest':
      return list.sort((a, b) => b.addedOn.localeCompare(a.addedOn));
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price);
    case 'discount':
      return list.sort((a, b) => b.discount - a.discount);
    case 'rating':
      return list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case 'recommended':
    default:
      return list.sort(
        (a, b) =>
          b.rating * Math.log10(b.reviewCount + 10) - a.rating * Math.log10(a.reviewCount + 10),
      );
  }
}

export function countActiveFilters(f: FilterState): number {
  return (
    f.brands.length +
    f.sizes.length +
    f.colors.length +
    f.subcategories.length +
    (f.priceMin !== null || f.priceMax !== null ? 1 : 0) +
    (f.minDiscount !== null ? 1 : 0) +
    (f.minRating !== null ? 1 : 0)
  );
}

/* ---------------- Search ---------------- */

const SYNONYMS: Record<string, string[]> = {
  dress: ['dress', 'dresses', 'gown', 'maxi', 'midi'],
  jeans: ['jeans', 'denim', 'jean'],
  tshirt: ['tshirt', 't-shirt', 'tee', 'tees', 'polo'],
  shirt: ['shirt', 'shirts', 'formal'],
  top: ['top', 'tops', 'blouse', 'kurta', 'tunic', 'cami'],
  shoes: ['shoe', 'shoes', 'sneaker', 'sneakers', 'heel', 'heels', 'boot', 'boots', 'flats'],
};

function expand(term: string): string[] {
  const t = term.toLowerCase();
  for (const variants of Object.values(SYNONYMS)) {
    if (variants.some((v) => v.startsWith(t) || t.startsWith(v))) return variants;
  }
  return [t];
}

/** Weighted token search over brand, name, category and attributes. Scores are
 *  only used for ordering within the search page. */
export function searchProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = products
    .map((p) => {
      const haystacks: [string, number][] = [
        [p.brand.toLowerCase(), 6],
        [p.name.toLowerCase(), 5],
        [p.subcategory.toLowerCase(), 4],
        [p.category.toLowerCase(), 3],
        [p.gender.toLowerCase(), 2],
        [p.fit.toLowerCase(), 2],
        [p.material.toLowerCase(), 1],
        [p.tags.join(' ').toLowerCase(), 1],
      ];

      let score = 0;
      tokens.forEach((token) => {
        const variants = expand(token);
        let best = 0;
        haystacks.forEach(([text, weight]) => {
          if (variants.some((v) => text.includes(v))) best = Math.max(best, weight);
        });
        score += best;
      });

      // Every token must land somewhere, otherwise it isn't a match.
      const allMatched = tokens.every((token) => {
        const variants = expand(token);
        return haystacks.some(([text]) => variants.some((v) => text.includes(v)));
      });

      return { p, score: allMatched ? score : 0 };
    })
    .filter((s) => s.score > 0);

  return scored
    .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating)
    .map((s) => s.p);
}

/** Type-ahead suggestions: brands and category shortcuts, then product names. */
export function suggest(
  products: Product[],
  query: string,
): { label: string; to: string; kind: 'brand' | 'category' | 'product' }[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const out: { label: string; to: string; kind: 'brand' | 'category' | 'product' }[] = [];

  const brands = [...new Set(products.map((p) => p.brand))]
    .filter((b) => b.toLowerCase().includes(q))
    .slice(0, 3);
  brands.forEach((b) =>
    out.push({ label: b, to: `/search?q=${encodeURIComponent(b)}`, kind: 'brand' }),
  );

  const cats: { label: string; to: string }[] = [
    { label: 'Dresses', to: '/c/dresses' },
    { label: 'Jeans', to: '/c/jeans' },
    { label: 'Tops', to: '/c/tops?sub=tops' },
    { label: 'Shirts', to: '/c/tops?sub=shirts' },
    { label: 'T-Shirts', to: '/c/tops?sub=t-shirts' },
    { label: 'Shoes', to: '/c/shoes' },
  ];
  cats
    .filter((c) => c.label.toLowerCase().includes(q))
    .slice(0, 2)
    .forEach((c) => out.push({ ...c, kind: 'category' }));

  searchProducts(products, query)
    .slice(0, 5)
    .forEach((p) =>
      out.push({ label: `${p.brand} ${p.name}`, to: `/p/${p.id}`, kind: 'product' }),
    );

  return out.slice(0, 8);
}

/** Similar products: same subcategory first, then same gender, excluding self. */
export function relatedProducts(all: Product[], product: Product, limit = 8): Product[] {
  const sameSub = all.filter((p) => p.id !== product.id && p.subcategory === product.subcategory);
  const sameGender = all.filter(
    (p) => p.id !== product.id && p.gender === product.gender && p.subcategory !== product.subcategory,
  );
  const scored = sameSub
    .map((p) => ({
      p,
      score:
        (p.brand === product.brand ? 3 : 0) +
        (Math.abs(p.price - product.price) < 700 ? 2 : 0) +
        p.rating / 2,
    }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.p);

  return [...scored, ...sameGender].slice(0, limit);
}

export const SUBCATEGORY_ORDER: SubcategoryId[] = [
  'dresses',
  'tops',
  'shirts',
  't-shirts',
  'jeans',
  'shoes',
];
