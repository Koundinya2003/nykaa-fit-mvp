import { useEffect, useMemo, useState } from 'react';
import type { Product, SubcategoryId } from '@/types';
import type { FilterControls } from '@/hooks/useProductFilters';
import { DISCOUNT_BANDS, PRICE_BANDS, RATING_BANDS, SIZE_GROUPS } from '@/data/products';
import { COLOR_FAMILIES } from '@/data/palette';
import { SUBCATEGORY_LABEL } from '@/data/categories';
import { matchesColorFamily, countActiveFilters } from '@/utils/catalogue';
import { ChevronDown, CloseIcon, StarIcon } from './Icons';
import '@/styles/listing.css';

interface Props extends FilterControls {
  /** Products in scope *before* filters — used for the per-option counts. */
  scope: Product[];
  /** Products after filtering — shown in the mobile drawer's apply button. */
  resultCount: number;
  open: boolean;
  onClose: () => void;
}

type SectionId = 'sub' | 'brand' | 'price' | 'size' | 'color' | 'discount' | 'rating';

function Section({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`fsec ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="fsec__head"
        aria-expanded={open}
        onClick={() => onToggle(id)}
      >
        <span>{title}</span>
        <ChevronDown size={16} className="fsec__chev" />
      </button>
      {open && <div className="fsec__body">{children}</div>}
    </section>
  );
}

export default function FilterPanel({
  scope,
  resultCount,
  open,
  onClose,
  filters,
  toggleList,
  setPriceBand,
  setMinDiscount,
  setMinRating,
  clearAll,
}: Props) {
  const [openSections, setOpenSections] = useState<SectionId[]>(['sub', 'brand', 'price', 'size']);
  const toggleSection = (id: SectionId) =>
    setOpenSections((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  // Lock the page behind the mobile drawer.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /** Counts are computed against the unfiltered scope so a shopper can see how
   *  many products sit behind an option before committing to it. */
  const facets = useMemo(() => {
    const brands = new Map<string, number>();
    const subs = new Map<SubcategoryId, number>();
    const sizes = new Map<string, number>();

    scope.forEach((p) => {
      brands.set(p.brand, (brands.get(p.brand) ?? 0) + 1);
      subs.set(p.subcategory, (subs.get(p.subcategory) ?? 0) + 1);
      p.sizes.forEach((s) => {
        if (!p.soldOutSizes.includes(s)) sizes.set(s, (sizes.get(s) ?? 0) + 1);
      });
    });

    const colors = COLOR_FAMILIES.map((f) => ({
      ...f,
      count: scope.filter((p) => matchesColorFamily(p, f.label)).length,
    })).filter((f) => f.count > 0);

    return {
      brands: [...brands.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      subs: [...subs.entries()],
      sizes,
      colors,
    };
  }, [scope]);

  const activeCount = countActiveFilters(filters);
  const activePriceBand = PRICE_BANDS.find(
    (b) => b.min === filters.priceMin && b.max === filters.priceMax,
  );

  return (
    <>
      <div className={`drawer-scrim filters__scrim ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden />
      <aside className={`filters ${open ? 'is-open' : ''}`} aria-label="Filters">
        <div className="filters__head">
          <p className="filters__title">
            Filters {activeCount > 0 && <span className="filters__count">{activeCount}</span>}
          </p>
          <button type="button" className="filters__clear" onClick={clearAll} disabled={activeCount === 0}>
            Clear All
          </button>
          <button type="button" className="filters__close" aria-label="Close filters" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="filters__body">
          {facets.subs.length > 1 && (
            <Section id="sub" title="Category" open={openSections.includes('sub')} onToggle={toggleSection}>
              {facets.subs.map(([sub, count]) => (
                <label key={sub} className="fopt">
                  <input
                    type="checkbox"
                    checked={filters.subcategories.includes(sub)}
                    onChange={() => toggleList('sub', sub)}
                  />
                  <span className="fopt__label">{SUBCATEGORY_LABEL[sub]}</span>
                  <span className="fopt__count">{count}</span>
                </label>
              ))}
            </Section>
          )}

          <Section id="brand" title="Brand" open={openSections.includes('brand')} onToggle={toggleSection}>
            <div className="fsec__scroll">
              {facets.brands.map(([brand, count]) => (
                <label key={brand} className="fopt">
                  <input
                    type="checkbox"
                    checked={filters.brands.includes(brand)}
                    onChange={() => toggleList('brand', brand)}
                  />
                  <span className="fopt__label">{brand}</span>
                  <span className="fopt__count">{count}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section id="price" title="Price" open={openSections.includes('price')} onToggle={toggleSection}>
            {PRICE_BANDS.map((band) => {
              const checked = activePriceBand?.label === band.label;
              return (
                <label key={band.label} className="fopt">
                  <input
                    type="radio"
                    name="price-band"
                    checked={checked}
                    onChange={() => setPriceBand(checked ? null : band.min, checked ? null : band.max)}
                    onClick={() => checked && setPriceBand(null, null)}
                  />
                  <span className="fopt__label">{band.label}</span>
                  <span className="fopt__count">
                    {scope.filter(
                      (p) => p.price >= band.min && (band.max === null || p.price <= band.max),
                    ).length}
                  </span>
                </label>
              );
            })}
          </Section>

          <Section id="size" title="Size" open={openSections.includes('size')} onToggle={toggleSection}>
            {SIZE_GROUPS.map((group) => {
              const available = group.sizes.filter((s) => (facets.sizes.get(s) ?? 0) > 0);
              if (available.length === 0) return null;
              return (
                <div key={group.label} className="fsize">
                  <p className="fsize__label">{group.label}</p>
                  <div className="fsize__chips">
                    {available.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={`fchip ${filters.sizes.includes(size) ? 'is-active' : ''}`}
                        aria-pressed={filters.sizes.includes(size)}
                        onClick={() => toggleList('size', size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </Section>

          <Section id="color" title="Colour" open={openSections.includes('color')} onToggle={toggleSection}>
            <div className="fcolors">
              {facets.colors.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  className={`fcolor ${filters.colors.includes(f.label) ? 'is-active' : ''}`}
                  aria-pressed={filters.colors.includes(f.label)}
                  onClick={() => toggleList('color', f.label)}
                >
                  <span className="fcolor__dot" style={{ background: f.hex }} />
                  <span className="fcolor__label">{f.label}</span>
                  <span className="fopt__count">{f.count}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section id="discount" title="Discount" open={openSections.includes('discount')} onToggle={toggleSection}>
            {DISCOUNT_BANDS.map((d) => (
              <label key={d} className="fopt">
                <input
                  type="radio"
                  name="discount-band"
                  checked={filters.minDiscount === d}
                  onChange={() => setMinDiscount(d)}
                  onClick={() => filters.minDiscount === d && setMinDiscount(null)}
                />
                <span className="fopt__label">{d}% and above</span>
                <span className="fopt__count">{scope.filter((p) => p.discount >= d).length}</span>
              </label>
            ))}
          </Section>

          <Section id="rating" title="Customer Rating" open={openSections.includes('rating')} onToggle={toggleSection}>
            {RATING_BANDS.map((r) => (
              <label key={r} className="fopt">
                <input
                  type="radio"
                  name="rating-band"
                  checked={filters.minRating === r}
                  onChange={() => setMinRating(r)}
                  onClick={() => filters.minRating === r && setMinRating(null)}
                />
                <span className="fopt__label fopt__label--rating">
                  {r}
                  <StarIcon size={12} /> &amp; above
                </span>
                <span className="fopt__count">{scope.filter((p) => p.rating >= r).length}</span>
              </label>
            ))}
          </Section>
        </div>

        <div className="filters__foot">
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearAll}>
            Clear
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={onClose}>
            Show {resultCount} {resultCount === 1 ? 'item' : 'items'}
          </button>
        </div>
      </aside>
    </>
  );
}
