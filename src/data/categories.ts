import type { Category, CategoryId, Product, SubcategoryId } from '@/types';

/** Shelf definitions. `navGroups` drives the desktop mega-menu; every link in
 *  here resolves to a real route with real products behind it. */
export const CATEGORIES: Category[] = [
  {
    id: 'women',
    label: 'Women',
    tagline: 'Dresses, tops and denim, edited for the season',
    gender: 'women',
    subcategories: ['dresses', 'tops', 'jeans', 'shoes'],
    navGroups: [
      {
        title: 'Clothing',
        links: [
          { label: 'Dresses', to: '/c/dresses' },
          { label: 'Tops & Shirts', to: '/c/tops?sub=tops' },
          { label: 'Jeans & Denim', to: '/c/jeans?gender=women' },
          { label: 'All Womenswear', to: '/c/women' },
        ],
      },
      {
        title: 'Footwear',
        links: [
          { label: 'Heels', to: '/c/shoes?gender=women' },
          { label: 'Flats & Ballerinas', to: '/c/shoes?gender=women' },
          { label: 'Sneakers', to: '/c/shoes?gender=women' },
        ],
      },
      {
        title: 'Shop by Edit',
        links: [
          { label: 'Festive Edit', to: '/c/women?tag=festive-edit' },
          { label: 'Workwear Edit', to: '/c/women?tag=workwear-edit' },
          { label: 'Party Edit', to: '/c/women?tag=party-edit' },
          { label: 'Summer Edit', to: '/c/women?tag=summer-edit' },
        ],
      },
    ],
  },
  {
    id: 'men',
    label: 'Men',
    tagline: 'Shirts, tees and denim built to be worn hard',
    gender: 'men',
    subcategories: ['shirts', 't-shirts', 'jeans', 'shoes'],
    navGroups: [
      {
        title: 'Clothing',
        links: [
          { label: 'Shirts', to: '/c/tops?sub=shirts' },
          { label: 'T-Shirts & Polos', to: '/c/tops?sub=t-shirts' },
          { label: 'Jeans', to: '/c/jeans?gender=men' },
          { label: 'All Menswear', to: '/c/men' },
        ],
      },
      {
        title: 'Footwear',
        links: [
          { label: 'Sneakers', to: '/c/shoes?gender=men' },
          { label: 'Formal Shoes', to: '/c/shoes?gender=men' },
          { label: 'Boots', to: '/c/shoes?gender=men' },
        ],
      },
      {
        title: 'Shop by Edit',
        links: [
          { label: 'Workwear Edit', to: '/c/men?tag=workwear-edit' },
          { label: 'Party Edit', to: '/c/men?tag=party-edit' },
          { label: 'Summer Edit', to: '/c/men?tag=summer-edit' },
          { label: 'Bestsellers', to: '/c/men?tag=bestseller' },
        ],
      },
    ],
  },
  {
    id: 'dresses',
    label: 'Dresses',
    tagline: 'Maxis, midis and everything for the evening',
    gender: 'women',
    subcategories: ['dresses'],
    navGroups: [
      {
        title: 'By Length',
        links: [
          { label: 'Maxi Dresses', to: '/c/dresses' },
          { label: 'Midi Dresses', to: '/c/dresses' },
          { label: 'Short Dresses', to: '/c/dresses' },
        ],
      },
      {
        title: 'By Occasion',
        links: [
          { label: 'Party Dresses', to: '/c/dresses?tag=party-edit' },
          { label: 'Festive Dresses', to: '/c/dresses?tag=festive-edit' },
          { label: 'Workwear Dresses', to: '/c/dresses?tag=workwear-edit' },
        ],
      },
    ],
  },
  {
    id: 'tops',
    label: 'Tops & Shirts',
    tagline: 'From crisp oxfords to everyday knits',
    gender: 'all',
    subcategories: ['tops', 'shirts', 't-shirts'],
    navGroups: [
      {
        title: 'Women',
        links: [
          { label: 'Tops & Blouses', to: '/c/tops?sub=tops' },
          { label: 'Kurtas & Tunics', to: '/c/tops?sub=tops' },
        ],
      },
      {
        title: 'Men',
        links: [
          { label: 'Shirts', to: '/c/tops?sub=shirts' },
          { label: 'T-Shirts & Polos', to: '/c/tops?sub=t-shirts' },
        ],
      },
    ],
  },
  {
    id: 'jeans',
    label: 'Jeans',
    tagline: 'Denim in every rise, wash and leg',
    gender: 'all',
    subcategories: ['jeans'],
    navGroups: [
      {
        title: 'Women',
        links: [
          { label: "Women's Jeans", to: '/c/jeans?gender=women' },
          { label: 'Wide Leg', to: '/c/jeans?gender=women' },
          { label: 'Skinny', to: '/c/jeans?gender=women' },
        ],
      },
      {
        title: 'Men',
        links: [
          { label: "Men's Jeans", to: '/c/jeans?gender=men' },
          { label: 'Slim Fit', to: '/c/jeans?gender=men' },
          { label: 'Straight Fit', to: '/c/jeans?gender=men' },
        ],
      },
    ],
  },
  {
    id: 'shoes',
    label: 'Shoes',
    tagline: 'Sneakers, heels and everything between',
    gender: 'all',
    subcategories: ['shoes'],
    navGroups: [
      {
        title: 'Women',
        links: [
          { label: 'Heels & Sandals', to: '/c/shoes?gender=women' },
          { label: 'Flats', to: '/c/shoes?gender=women' },
        ],
      },
      {
        title: 'Men',
        links: [
          { label: 'Sneakers', to: '/c/shoes?gender=men' },
          { label: 'Formal Shoes', to: '/c/shoes?gender=men' },
          { label: 'Boots', to: '/c/shoes?gender=men' },
        ],
      },
    ],
  },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string | undefined): Category | undefined {
  return id ? BY_ID.get(id as CategoryId) : undefined;
}

export const SUBCATEGORY_LABEL: Record<SubcategoryId, string> = {
  dresses: 'Dresses',
  tops: 'Tops & Blouses',
  jeans: 'Jeans',
  shirts: 'Shirts',
  't-shirts': 'T-Shirts & Polos',
  shoes: 'Footwear',
};

/**
 * A category page is defined by whether it selects on gender (women/men) or on
 * the product's own category field. `/c/women` therefore returns dresses, tops,
 * jeans and shoes for women, while `/c/jeans` returns denim for everyone.
 */
export function matchesCategory(product: Product, categoryId: CategoryId): boolean {
  if (categoryId === 'women' || categoryId === 'men') {
    return product.gender === categoryId;
  }
  return product.category === categoryId;
}

/** Breadcrumb trail for a product, ending at the product itself. */
export function breadcrumbsFor(product: Product): { label: string; to?: string }[] {
  const genderCat = product.gender === 'men' ? 'men' : 'women';
  const genderLabel = product.gender === 'men' ? 'Men' : 'Women';
  const category = getCategory(product.category);
  return [
    { label: 'Home', to: '/' },
    { label: genderLabel, to: `/c/${genderCat}` },
    {
      label: SUBCATEGORY_LABEL[product.subcategory],
      to: `/c/${category?.id ?? product.category}?sub=${product.subcategory}`,
    },
    { label: product.name },
  ];
}
