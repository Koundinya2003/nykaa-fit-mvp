import type { BagItem, PriceSummary, Product } from '@/types';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return INR.format(value);
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export const FREE_DELIVERY_THRESHOLD = 999;
export const DELIVERY_FEE = 99;

/** Single source of truth for bag maths — used by the bag page, the header
 *  count and the sticky checkout bar so the numbers can never disagree. */
export function summarise(
  items: BagItem[],
  lookup: (id: string) => Product | undefined,
): PriceSummary {
  let mrpTotal = 0;
  let sellingTotal = 0;
  let itemCount = 0;

  items.forEach((item) => {
    const product = lookup(item.productId);
    if (!product) return;
    mrpTotal += product.mrp * item.quantity;
    sellingTotal += product.price * item.quantity;
    itemCount += item.quantity;
  });

  const deliveryFee =
    sellingTotal === 0 || sellingTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;

  return {
    itemCount,
    mrpTotal,
    sellingTotal,
    discountTotal: mrpTotal - sellingTotal,
    deliveryFee,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
    payable: sellingTotal + deliveryFee,
  };
}

/** Deterministic delivery promise so the PDP and bag agree. */
export function deliveryEstimate(pincode: string): { days: number; label: string } {
  const digits = pincode.replace(/\D/g, '');
  const seed = digits.split('').reduce((acc, d) => acc + Number(d), 0);
  const days = 2 + (seed % 4);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return {
    days,
    label: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
  };
}

export function bagKey(productId: string, size: string, colorName: string): string {
  return `${productId}::${size}::${colorName}`;
}
