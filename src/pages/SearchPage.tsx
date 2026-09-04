import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PRODUCTS } from '@/data/products';
import { useProductFilters } from '@/hooks/useProductFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { applyFilters, applySort, countActiveFilters, searchProducts } from '@/utils/catalogue';
import { formatCount } from '@/utils/format';
import ProductGrid from '@/components/ProductGrid';
import FilterPanel from '@/components/FilterPanel';
import SortDropdown from '@/components/SortDropdown';
import ActiveFilters from '@/components/ActiveFilters';
import Breadcrumbs from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import { FilterIcon } from '@/components/Icons';
import '@/styles/listing.css';

const SUGGESTED = ['dress', 'jeans', 'shirt', 'polo', 'sneakers', 'kurta'];

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const controls = useProductFilters();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The query itself comes from the URL, so the only real latency is the
  // debounce — which is what the skeleton state covers.
  const debounced = useDebounce(query, 180);
  const settling = debounced !== query;

  const scope = useMemo(() => searchProducts(PRODUCTS, debounced), [debounced]);
  const results = useMemo(
    () =>
      controls.sort === 'recommended'
        ? applyFilters(scope, controls.filters) // preserve relevance order
        : applySort(applyFilters(scope, controls.filters), controls.sort),
    [scope, controls.filters, controls.sort],
  );

  const activeCount = countActiveFilters(controls.filters);

  if (!query.trim()) {
    return (
      <div className="page section">
        <EmptyState
          title="What are you looking for?"
          body="Search by brand, garment or fabric — try “Libas”, “wide leg jeans” or “oxford shirt”."
          ctaLabel="Browse the catalogue"
          ctaTo="/c/women"
        />
      </div>
    );
  }

  return (
    <div className="page listing">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: `Search: ${query}` }]} />

      <header className="listing__head">
        <div>
          <h1 className="display listing__title">“{query}”</h1>
          <p className="listing__tagline">
            {settling
              ? 'Searching…'
              : `${formatCount(results.length)} ${results.length === 1 ? 'result' : 'results'} in the catalogue`}
          </p>
        </div>
      </header>

      <nav className="listing__shelves" aria-label="Suggested searches">
        {SUGGESTED.map((s) => (
          <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className={`listing__shelf ${s === query ? 'is-active' : ''}`}>
            {s}
          </Link>
        ))}
      </nav>

      <div className="listing__toolbar">
        <button type="button" className="listing__filter-btn" onClick={() => setDrawerOpen(true)}>
          <FilterIcon />
          Filters
          {activeCount > 0 && <span className="listing__filter-count">{activeCount}</span>}
        </button>
        <SortDropdown value={controls.sort} onChange={controls.setSort} />
      </div>

      <div className="listing__layout">
        <FilterPanel
          {...controls}
          scope={scope}
          resultCount={results.length}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />

        <div className="listing__results">
          <div className="listing__results-head">
            <ActiveFilters
              filters={controls.filters}
              onClear={controls.clearOne}
              onClearAll={controls.clearAll}
            />
            <div className="listing__sort-desktop">
              <SortDropdown value={controls.sort} onChange={controls.setSort} />
            </div>
          </div>

          <ProductGrid
            products={results}
            columns={4}
            loading={settling}
            emptyState={
              <EmptyState
                title={`No results for “${query}”`}
                body={
                  activeCount > 0
                    ? 'Your filters may be too narrow. Try clearing them, or search for something broader.'
                    : 'Check the spelling, or try a broader term such as “dress”, “jeans” or “shirt”.'
                }
                actionLabel={activeCount > 0 ? 'Clear all filters' : undefined}
                onAction={activeCount > 0 ? controls.clearAll : undefined}
                ctaLabel="Browse the catalogue"
                ctaTo="/c/women"
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
