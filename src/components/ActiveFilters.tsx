import type { FilterState } from '@/types';
import { PRICE_BANDS } from '@/data/products';
import { SUBCATEGORY_LABEL } from '@/data/categories';
import { CloseIcon } from './Icons';
import '@/styles/listing.css';

interface Props {
  filters: FilterState;
  onClear: (key: keyof FilterState, value?: string) => void;
  onClearAll: () => void;
}

/** Removable chips for everything currently narrowing the grid. */
export default function ActiveFilters({ filters, onClear, onClearAll }: Props) {
  const chips: { key: keyof FilterState; value?: string; label: string }[] = [
    ...filters.subcategories.map((s) => ({
      key: 'subcategories' as const,
      value: s,
      label: SUBCATEGORY_LABEL[s],
    })),
    ...filters.brands.map((b) => ({ key: 'brands' as const, value: b, label: b })),
    ...filters.sizes.map((s) => ({ key: 'sizes' as const, value: s, label: `Size ${s}` })),
    ...filters.colors.map((c) => ({ key: 'colors' as const, value: c, label: c })),
  ];

  if (filters.priceMin !== null || filters.priceMax !== null) {
    const band = PRICE_BANDS.find((b) => b.min === filters.priceMin && b.max === filters.priceMax);
    chips.push({ key: 'priceMin', label: band?.label ?? 'Custom price' });
  }
  if (filters.minDiscount !== null) {
    chips.push({ key: 'minDiscount', label: `${filters.minDiscount}%+ off` });
  }
  if (filters.minRating !== null) {
    chips.push({ key: 'minRating', label: `${filters.minRating}★ & above` });
  }

  if (chips.length === 0) return null;

  return (
    <div className="active-filters">
      {chips.map((chip) => (
        <button
          key={`${chip.key}-${chip.value ?? ''}`}
          type="button"
          className="active-filters__chip"
          onClick={() => onClear(chip.key, chip.value)}
        >
          {chip.label}
          <CloseIcon size={13} />
        </button>
      ))}
      <button type="button" className="active-filters__clear" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  );
}
