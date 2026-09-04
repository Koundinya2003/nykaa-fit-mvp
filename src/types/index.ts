/* =========================================================================
   Domain types for the Nykaa Fit MVP.
   ========================================================================= */

export type Gender = 'women' | 'men' | 'unisex';

/** Top-level shelf a product hangs off. Maps 1:1 to a /c/:category route. */
export type CategoryId = 'women' | 'men' | 'dresses' | 'tops' | 'jeans' | 'shoes';

/** Finer-grained shelf, used for breadcrumbs, filters and recommendations. */
export type SubcategoryId =
  | 'dresses'
  | 'tops'
  | 'jeans'
  | 'shirts'
  | 't-shirts'
  | 'shoes';

/** Fit is modelled explicitly because Nykaa Fit will reason over it later. */
export type FitType =
  | 'Regular Fit'
  | 'Slim Fit'
  | 'Relaxed Fit'
  | 'Bodycon'
  | 'A-Line'
  | 'Oversized'
  | 'Skinny'
  | 'Straight'
  | 'Boyfriend'
  | 'True to Size';

export type Availability = 'in-stock' | 'low-stock' | 'out-of-stock';

/* ---------- Sizing metadata (consumed by the Nykaa Fit engine) ---------- */

/** Normalised cut of the garment. `fit` above is the marketing label
 *  ("A-Line", "Bodycon"); this is the machine-readable class derived from it. */
export type FitClass = 'slim' | 'regular' | 'relaxed' | 'oversized';

/** Body measurements in inches. A size chart maps a size label to the body
 *  these garment dimensions are cut for — not to the garment's own flat
 *  measurements. */
export interface BodyMeasurements {
  bust: number;
  waist: number;
  hip: number;
}

/** Size label -> the body the brand cuts that size for. */
export type ProductSizeChart = Record<string, BodyMeasurements>;

/** How the finished garment behaves relative to the brand's published chart.
 *  Separate from the chart itself: a brand can publish an accurate chart and
 *  still sew garments that run small. */
export interface BrandSizing {
  label: 'Runs small' | 'True to size' | 'Runs large';
  /** Extra room, in inches, the garment gives versus its published chart.
   *  Negative = runs small. */
  ease: number;
  /** Shown to the shopper in the explainability panel. */
  note: string;
}

export interface ProductColor {
  /** Display name, e.g. "Wine". */
  name: string;
  /** Hex used both for the swatch and for tinting the generated imagery. */
  hex: string;
}

export interface ProductImage {
  /** Stable id used as a React key and as the generated-art seed. */
  id: string;
  /** Which colourway this shot belongs to. */
  colorName: string;
  /** Camera angle, drives the generated garment illustration. */
  view: 'front' | 'back' | 'detail' | 'styled';
  alt: string;
}

export interface Product {
  id: string;
  brand: string;
  name: string;
  category: CategoryId;
  subcategory: SubcategoryId;
  gender: Gender;
  /** Selling price in INR (integer rupees). */
  price: number;
  /** Maximum retail price in INR. Always >= price. */
  mrp: number;
  /** Whole-number percentage off, derived from price/mrp at build time. */
  discount: number;
  /** 0–5, one decimal. */
  rating: number;
  reviewCount: number;
  images: ProductImage[];
  colors: ProductColor[];
  sizes: string[];
  /** Sizes that exist in the catalogue but are sold out for this product. */
  soldOutSizes: string[];
  description: string;
  details: string[];
  material: string;
  fit: FitType;
  /** Normalised form of `fit`, used by the recommendation engine. */
  fitClass: FitClass;
  /** Present only on products Nykaa Fit is enabled for. */
  sizeChart?: ProductSizeChart;
  brandSizing?: BrandSizing;
  availability: Availability;
  /** Marketing flags used by the homepage rails and PLP badges. */
  tags: string[];
  /** ISO date — powers the "Newest First" sort. */
  addedOn: string;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
  /** Free-text fit feedback, deliberately shaped for Nykaa Fit to consume later. */
  fitFeedback: 'Runs small' | 'True to size' | 'Runs large';
  sizeBought: string;
}

export interface SizeChartRow {
  size: string;
  /** Measurements in inches; label order is defined by SizeChart.columns. */
  values: number[];
}

export interface SizeChart {
  id: string;
  title: string;
  columns: string[];
  rows: SizeChartRow[];
  note: string;
}

/* ---------- Cart / wishlist ---------- */

export interface BagItem {
  /** `${productId}::${size}::${colorName}` — one line per variant. */
  key: string;
  productId: string;
  size: string;
  colorName: string;
  quantity: number;
  addedAt: number;
}

export interface PriceSummary {
  itemCount: number;
  mrpTotal: number;
  sellingTotal: number;
  discountTotal: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  payable: number;
}

/* ---------- Listing controls ---------- */

export type SortId =
  | 'recommended'
  | 'popularity'
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'discount'
  | 'rating';

export interface FilterState {
  brands: string[];
  sizes: string[];
  colors: string[];
  /** Inclusive lower bound of the selected price band, in INR. */
  priceMin: number | null;
  priceMax: number | null;
  /** Minimum discount percentage. */
  minDiscount: number | null;
  /** Minimum star rating. */
  minRating: number | null;
  subcategories: SubcategoryId[];
}

export interface Category {
  id: CategoryId;
  label: string;
  /** Shown in the hero band of the listing page. */
  tagline: string;
  gender: Gender | 'all';
  subcategories: SubcategoryId[];
  /** Nav column grouping on the desktop mega-menu. */
  navGroups: { title: string; links: { label: string; to: string }[] }[];
}
