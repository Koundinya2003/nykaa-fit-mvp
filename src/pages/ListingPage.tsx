import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PRODUCTS } from '@/data/products';
import { CATEGORIES, getCategory, matchesCategory, SUBCATEGORY_LABEL } from '@/data/categories';
import { useProductFilters } from '@/hooks/useProductFilters';
import { applyFilters, applySort, countActiveFilters } from '@/utils/catalogue';
import { formatCount } from '@/utils/format';
import ProductGrid from '@/components/ProductGrid';
import FilterPanel from '@/components/FilterPanel';
import SortDropdown from '@/components/SortDropdown';
import Breadcrumbs from '@/components/Breadcrumbs';
import ActiveFilters from '@/components/ActiveFilters';
import EmptyState from '@/components/EmptyState';
import NotFoundPage from './NotFoundPage';
import { FilterIcon } from '@/components/Icons';
import '@/styles/listing.css';

const TAG_LABEL: Record<string, string> = {
  'festive-edit': 'Festive Edit',
  'workwear-edit': 'Workwear Edit',
  'party-edit': 'Party Edit',
  'summer-edit': 'Summer Edit',
  bestseller: 'Bestsellers',
  trending: 'Trending',
};

export default function ListingPage() {
  const { categoryId } = useParams();
  const category = getCategory(categoryId);
  const controls = useProductFilters();
  const [drawerOpen, setDrawerOpen] = useState(false);

  /** Products the page is about, before any user-applied facet. Category,
   *  ?gender and ?tag all narrow the scope rather than acting as filters, so
   *  they stay out of the removable filter chips. */
  const scope = useMemo(() => {
    if (!category) return [];
    let list = PRODUCTS.filter((p) => matchesCategory(p, category.id));
    if (controls.gender) list = list.filter((p) => p.gender === controls.gender);
    if (controls.tag) list = list.filter((p) => p.tags.includes(controls.tag!));
    return list;
  }, [category, controls.gender, controls.tag]);

  const results = useMemo(
    () => applySort(applyFilters(scope, controls.filters), controls.sort),
    [scope, controls.filters, controls.sort],
  );

  if (!category) return <NotFoundPage />;

  const activeCount = countActiveFilters(controls.filters);
  const hasSubShelves = category.subcategories.length > 1;
  const tagLabel = controls.tag ? (TAG_LABEL[controls.tag] ?? controls.tag) : null;

  // Gender context can come from the shelf itself (/c/men) or from ?gender=
  // on a mixed shelf (/c/jeans?gender=women).
  const isGenderShelf = category.id === 'women' || category.id === 'men';
  const genderId = isGenderShelf ? category.id : controls.gender;
  const genderLabel = genderId === 'men' ? 'Men' : genderId === 'women' ? 'Women' : null;

  // Only prefix the gender when it is not already what the heading says.
  const showGender = Boolean(genderLabel) && (Boolean(tagLabel) || !isGenderShelf);
  const heading = [showGender ? genderLabel : null, tagLabel ?? category.label]
    .filter(Boolean)
    .join(' · ');

  const trail = [
    { label: 'Home', to: '/' },
    ...(showGender ? [{ label: genderLabel!, to: `/c/${genderId}` }] : []),
    { label: tagLabel ?? category.label },
  ];

  return (
    <div className="page listing">
      <Breadcrumbs trail={trail} />

      <header className="listing__head">
        <div>
          <h1 className="display listing__title">{heading}</h1>
          <p className="listing__tagline">{category.tagline}</p>
        </div>
        <p className="listing__count">
          {formatCount(results.length)} {results.length === 1 ? 'item' : 'items'}
          {results.length !== scope.length && (
            <span className="listing__count-of"> of {formatCount(scope.length)}</span>
          )}
        </p>
      </header>

      {/*
        Refinement chips. A category with several sub-shelves (Women, Men,
        Tops) refines within itself; a single-shelf category (Dresses, Jeans,
        Shoes) offers its siblings instead. Showing both produced duplicate
        "Dresses" / "Jeans" chips.
      */}
      <nav
        className="listing__shelves"
        aria-label={hasSubShelves ? 'Refine category' : 'Related categories'}
      >
        {hasSubShelves ? (
          <>
            <Link
              to={`/c/${category.id}${controls.gender ? `?gender=${controls.gender}` : ''}`}
              className={`listing__shelf ${
                controls.filters.subcategories.length === 0 ? 'is-active' : ''
              }`}
            >
              All {category.label}
            </Link>
            {category.subcategories.map((sub) => (
              <button
                key={sub}
                type="button"
                className={`listing__shelf ${
                  controls.filters.subcategories.includes(sub) ? 'is-active' : ''
                }`}
                aria-pressed={controls.filters.subcategories.includes(sub)}
                onClick={() => controls.toggleList('sub', sub)}
              >
                {SUBCATEGORY_LABEL[sub]}
              </button>
            ))}
          </>
        ) : (
          CATEGORIES.filter((c) => c.id !== category.id).map((c) => (
            <Link key={c.id} to={`/c/${c.id}`} className="listing__shelf">
              {c.label}
            </Link>
          ))
        )}
      </nav>

      <div className="listing__toolbar">
        <button
          type="button"
          className="listing__filter-btn"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
        >
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
            emptyState={
              <EmptyState
                title="No products match these filters"
                body="Try removing a filter or two — the catalogue holds 60 pieces across six shelves."
                actionLabel={activeCount > 0 ? 'Clear all filters' : undefined}
                onAction={activeCount > 0 ? controls.clearAll : undefined}
                ctaLabel="Browse everything"
                ctaTo={`/c/${category.id}`}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
