import type { Product } from '@/types';

/* =========================================================================
   Which products Nykaa Fit runs on.

   The MVP is deliberately scoped to women's dresses: one category, one body
   model, one set of brand charts — enough to measure whether fit guidance
   moves conversion without spreading thin across the catalogue.

   Widening the experiment means extending this predicate and adding brand
   charts for the new category; nothing in the UI needs to change.
   ========================================================================= */

export const FIT_ELIGIBLE_CATEGORY_LABEL = "Women's Dresses";

export function isFitEligible(product: Product): boolean {
  return (
    product.subcategory === 'dresses' &&
    product.gender === 'women' &&
    Boolean(product.sizeChart) &&
    Object.keys(product.sizeChart ?? {}).length > 1
  );
}
