import type { Product, SizeChart } from '@/types';

/** Body measurements in inches. One chart per garment family; the PDP picks
 *  the chart from the product's subcategory and gender. */
export const SIZE_CHARTS: SizeChart[] = [
  {
    id: 'women-apparel',
    title: "Women's Clothing — Body Measurements (in)",
    columns: ['Bust', 'Waist', 'Hip', 'Shoulder'],
    rows: [
      { size: 'XS', values: [32, 26, 35, 13.5] },
      { size: 'S', values: [34, 28, 37, 14] },
      { size: 'M', values: [36, 30, 39, 14.5] },
      { size: 'L', values: [38, 32, 41, 15] },
      { size: 'XL', values: [40, 34, 43, 15.5] },
      { size: 'XXL', values: [42, 36, 45, 16] },
    ],
    note: 'Measure over light clothing, keeping the tape level and snug. If you fall between two sizes, the larger size is the safer choice for structured fabrics.',
  },
  {
    id: 'men-apparel',
    title: "Men's Clothing — Body Measurements (in)",
    columns: ['Chest', 'Waist', 'Shoulder', 'Sleeve'],
    rows: [
      { size: 'XS', values: [34, 28, 16, 23.5] },
      { size: 'S', values: [36, 30, 17, 24] },
      { size: 'M', values: [38, 32, 17.5, 24.5] },
      { size: 'L', values: [40, 34, 18.5, 25] },
      { size: 'XL', values: [42, 36, 19, 25.5] },
      { size: 'XXL', values: [44, 38, 19.5, 26] },
    ],
    note: 'Chest is measured at the fullest point with arms relaxed. Slim-fit styles run roughly one inch closer to the body than regular fit.',
  },
  {
    id: 'women-denim',
    title: "Women's Denim — Waist & Hip (in)",
    columns: ['Waist', 'Hip', 'Inseam'],
    rows: [
      { size: '26', values: [26, 35, 28] },
      { size: '28', values: [28, 37, 28.5] },
      { size: '30', values: [30, 39, 29] },
      { size: '32', values: [32, 41, 29.5] },
      { size: '34', values: [34, 43, 30] },
      { size: '36', values: [36, 45, 30] },
    ],
    note: 'Denim size is the body waist measurement, not the finished garment. High-stretch styles relax about half an inch after a few wears.',
  },
  {
    id: 'men-denim',
    title: "Men's Denim — Waist & Inseam (in)",
    columns: ['Waist', 'Hip', 'Inseam'],
    rows: [
      { size: '28', values: [28, 35, 31] },
      { size: '30', values: [30, 37, 31.5] },
      { size: '32', values: [32, 39, 32] },
      { size: '34', values: [34, 41, 32] },
      { size: '36', values: [36, 43, 32.5] },
      { size: '38', values: [38, 45, 32.5] },
    ],
    note: 'Waist is measured on the body at the point where the jean sits. Non-stretch denim has no give — size up if you are between two waists.',
  },
  {
    id: 'women-footwear',
    title: "Women's Footwear — UK / EU / Foot Length",
    columns: ['EU', 'US', 'Foot Length (cm)'],
    rows: [
      { size: 'UK3', values: [36, 5, 22.5] },
      { size: 'UK4', values: [37, 6, 23.5] },
      { size: 'UK5', values: [38, 7, 24.1] },
      { size: 'UK6', values: [39, 8, 25] },
      { size: 'UK7', values: [40, 9, 25.7] },
      { size: 'UK8', values: [41, 10, 26.5] },
    ],
    note: 'Measure your foot at the end of the day when it is at its largest, standing with weight on it.',
  },
  {
    id: 'men-footwear',
    title: "Men's Footwear — UK / EU / Foot Length",
    columns: ['EU', 'US', 'Foot Length (cm)'],
    rows: [
      { size: 'UK6', values: [40, 7, 25] },
      { size: 'UK7', values: [41, 8, 25.7] },
      { size: 'UK8', values: [42, 9, 26.5] },
      { size: 'UK9', values: [43, 10, 27.3] },
      { size: 'UK10', values: [44, 11, 28] },
      { size: 'UK11', values: [45, 12, 28.8] },
    ],
    note: 'Measure your foot at the end of the day when it is at its largest, standing with weight on it.',
  },
];

const BY_ID = new Map(SIZE_CHARTS.map((c) => [c.id, c]));

export function getSizeChartFor(product: Product): SizeChart {
  const men = product.gender === 'men';
  const id =
    product.subcategory === 'shoes'
      ? men
        ? 'men-footwear'
        : 'women-footwear'
      : product.subcategory === 'jeans'
        ? men
          ? 'men-denim'
          : 'women-denim'
        : men
          ? 'men-apparel'
          : 'women-apparel';
  // Every branch above maps to a chart defined in SIZE_CHARTS.
  return BY_ID.get(id)!;
}
