import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { getProductById } from '@/data/products';
import Breadcrumbs from '@/components/Breadcrumbs';
import { RulerIcon, CheckIcon } from '@/components/Icons';
import {
  WishlistFitCard,
  addQuickStartItems,
  isResolved,
  markResolved,
  personalNotesFor,
  resolveWishlist,
  track,
  trackOnce,
  useFitEnabled,
  useFitOutcomes,
  useFitProfile,
  useResolutions,
  QUICK_START_COUNT,
  QUICK_START_BRAND_COUNT,
  WISHLIST_WINDOW_DAYS,
  type ResolvedWishlistItem,
} from '@/features/nykaa-fit';
import '@/styles/wishlist.css';

/* =========================================================================
   The wishlist — the surface this whole feature exists to serve.

   A wishlist is a queue of unresolved questions, and the only one that
   never resolves itself is "will this fit?". So the page does one thing:
   answer that for every saved item in a single pass, then sort the list by
   what the shopper has to do next.

   Nothing here is seeded. Items appear because she saved them, and their
   ages are real, so the 30-day window on screen is the actual window.
   ========================================================================= */

const RESOLVE_ANIMATION_MS = 650;

export default function WishlistPage() {
  const { wishlist, addToBag, setWishlistEntries } = useShop();
  const profile = useFitProfile();
  const fitEnabled = useFitEnabled();
  const resolutions = useResolutions();
  const outcomes = useFitOutcomes();
  const [params, setParams] = useSearchParams();
  const [resolving, setResolving] = useState(false);

  const entries = useMemo(
    () =>
      wishlist
        .map((entry) => ({ entry, product: getProductById(entry.productId) }))
        .filter((e): e is { entry: typeof e.entry; product: NonNullable<typeof e.product> } =>
          Boolean(e.product),
        ),
    [wishlist],
  );

  const notesForBrand = useCallback(
    (brand: string) => personalNotesFor(brand, outcomes),
    [outcomes],
  );

  const resolution = useMemo(
    () => resolveWishlist(entries, profile, Date.now(), notesForBrand),
    [entries, profile, notesForBrand],
  );

  const profileVersion = profile?.updatedAt ?? 0;
  const measurementCount = profile ? Object.keys(profile.measurements).length : 0;
  const canResolve = fitEnabled && measurementCount > 0;

  /** Items already answered against the CURRENT profile. Editing the
   *  profile invalidates every stored answer, because they are no longer
   *  the answers. */
  const resolvedIds = useMemo(() => {
    void resolutions;
    return new Set(
      entries
        .filter(({ entry }) => isResolved(entry.productId, profileVersion))
        .map(({ entry }) => entry.productId),
    );
  }, [entries, profileVersion, resolutions]);

  const unresolvedCount = entries.length - resolvedIds.size;
  const allResolved = entries.length > 0 && unresolvedCount === 0;

  useEffect(() => {
    if (entries.length === 0) return;
    trackOnce(`wishlist_viewed:${entries.length}:${profileVersion}`, 'wishlist_viewed', {
      item_count: entries.length,
      fit_profile_used: Boolean(profile),
      measurements_given: measurementCount,
    });
  }, [entries.length, profile, profileVersion, measurementCount]);

  /** The one wishlist-level action: run the recommender across every saved
   *  item in a single pass and log each answer. */
  const resolveAll = useCallback(() => {
    if (!profile || entries.length === 0) return;
    setResolving(true);

    const items = resolveWishlist(entries, profile, Date.now(), notesForBrand).items;

    track('wishlist_resolve_all', {
      item_count: items.length,
      measurements_given: Object.keys(profile.measurements).length,
      fit_profile_used: true,
    });

    items.forEach((item) => {
      track('wishlist_item_resolved', {
        product_id: item.product.id,
        brand: item.product.brand,
        category: item.product.subcategory,
        recommended_size: item.size,
        confidence_level: item.recommendation?.confidence.level,
        withheld: item.recommendation?.confidence.withheld ?? true,
        wishlist_group: item.group,
        days_saved: item.daysSaved,
        in_stock: item.inStock,
        fit_profile_used: true,
      });
    });

    markResolved(
      entries.map((e) => e.entry.productId),
      profile.updatedAt,
    );

    window.setTimeout(() => setResolving(false), RESOLVE_ANIMATION_MS);
  }, [entries, profile, notesForBrand]);

  // Arriving from the profile page with ?resolve=1 runs the pass on landing.
  useEffect(() => {
    if (params.get('resolve') !== '1') return;
    if (canResolve && entries.length > 0) resolveAll();
    const next = new URLSearchParams(params);
    next.delete('resolve');
    setParams(next, { replace: true });
  }, [params, setParams, canResolve, entries.length, resolveAll]);

  const handleQuickStart = () => {
    const { wishlist: next, added } = addQuickStartItems(wishlist);
    setWishlistEntries(next);
    track('wishlist_quick_start', { item_count: added.length });
  };

  const handleAddToBag = (item: ResolvedWishlistItem) => {
    if (!item.size) return;
    addToBag(item.product, item.size, item.product.colors[0].name);
    track('wishlist_add_to_bag', {
      product_id: item.product.id,
      brand: item.product.brand,
      category: item.product.subcategory,
      selected_size: item.size,
      recommended_size: item.size,
      size_source: 'recommended',
      changed_from_recommendation: false,
      confidence_level: item.recommendation?.confidence.level,
      days_saved: item.daysSaved,
      fit_profile_used: true,
      value: item.product.price,
      quantity: 1,
    });
  };

  /* ---- Empty ---- */
  if (entries.length === 0) {
    return (
      <div className="page wishlist">
        <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />
        <section className="wl-empty">
          <h1 className="display wl-empty__title">Your wishlist is empty</h1>
          <p className="wl-empty__body">
            Tap the heart on any product to save it here. Once something is saved, Nykaa Fit can
            tell you which size to buy in it — and whether that size is in stock.
          </p>
          <div className="wl-empty__actions">
            <Link to="/c/dresses" className="btn btn--accent">
              Browse dresses
            </Link>
            <button type="button" className="btn btn--ghost" onClick={handleQuickStart}>
              Save {QUICK_START_COUNT} sample pieces to try this
            </button>
          </div>
          <p className="wl-empty__note">
            The sample pieces are real products from {QUICK_START_BRAND_COUNT} brands, saved now.
            Your measurements are still yours to enter — we never invent those.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page wishlist">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />

      <header className="wl-head">
        <div>
          <h1 className="display wl-head__title">Wishlist</h1>
          <p className="wl-head__tagline">
            {entries.length} saved {entries.length === 1 ? 'item' : 'items'} · the{' '}
            {WISHLIST_WINDOW_DAYS}-day window starts the day you save
          </p>
        </div>

        {canResolve && (
          <div className="wl-head__action">
            <button
              type="button"
              className="btn btn--accent wl-resolve"
              onClick={resolveAll}
              disabled={resolving}
            >
              <RulerIcon size={17} />
              {resolving
                ? 'Resolving…'
                : allResolved
                  ? 'Re-resolve all saved items'
                  : `Resolve fit for all ${entries.length} saved items`}
            </button>
            {allResolved && !resolving && (
              <p className="wl-resolve__done">
                <CheckIcon size={14} /> Every saved item sized against your measurements
              </p>
            )}
            {!allResolved && !resolving && (
              <p className="wl-resolve__sub">
                {unresolvedCount} {unresolvedCount === 1 ? 'item has' : 'items have'} an unanswered
                fit question
              </p>
            )}
          </div>
        )}
      </header>

      {/* ---- No profile at all ---- */}
      {fitEnabled && !profile && (
        <section className="wl-prompt">
          <p className="wl-prompt__eyebrow">
            <RulerIcon size={15} /> Nykaa Fit
          </p>
          <h2 className="wl-prompt__title">
            Enter your measurements once and we&rsquo;ll size all {entries.length} saved{' '}
            {entries.length === 1 ? 'item' : 'items'}
          </h2>
          <p className="wl-prompt__body">
            Bust, waist and hip, in inches. We compare them against each brand&rsquo;s own
            published chart — so you get a size per brand, not one letter you hope travels. Your
            measurements stay on this device, and we never estimate the ones you skip.
          </p>
          <div className="wl-prompt__actions">
            <Link to="/fit-profile" className="btn btn--accent">
              Set up my fit profile
            </Link>
            <Link to={`/p/${entries[0].product.id}`} className="btn btn--ghost">
              Or start from a product
            </Link>
          </div>
        </section>
      )}

      {/* ---- Profile exists but has no measurements ---- */}
      {fitEnabled && profile && measurementCount === 0 && (
        <section className="wl-prompt">
          <p className="wl-prompt__eyebrow">
            <RulerIcon size={15} /> Nykaa Fit
          </p>
          <h2 className="wl-prompt__title">Your profile has no measurements yet</h2>
          <p className="wl-prompt__body">
            We have your fit preference but nothing to compare against a size chart. Add even one
            measurement and every saved dress below gets an answer.
          </p>
          <div className="wl-prompt__actions">
            <Link to="/fit-profile" className="btn btn--accent">
              Add my measurements
            </Link>
          </div>
        </section>
      )}

      {/* ---- Ready to resolve ---- */}
      {canResolve && !allResolved && !resolving && (
        <p className="wl-hint">
          Sized on your{' '}
          {measurementCount === 3 ? 'three measurements' : `${measurementCount} measurement${measurementCount === 1 ? '' : 's'}`}
          . Run one pass and every item below is sorted by what you have to do next.{' '}
          <Link to="/fit-profile">Edit your measurements</Link>
        </p>
      )}

      {canResolve && measurementCount < 3 && allResolved && (
        <p className="wl-hint wl-hint--upgrade">
          You&rsquo;ve given {measurementCount} of 3 measurements, so fewer items can be confirmed.{' '}
          <Link to="/fit-profile">Add the rest</Link> and items we become sure about move up to
          &ldquo;Ready to buy&rdquo;.
        </p>
      )}

      <div className={`wl-groups ${resolving ? 'is-resolving' : ''}`}>
        {resolution.groups.map(({ meta, items }) => (
          <section key={meta.id} className={`wl-group wl-group--${meta.id}`}>
            <header className="wl-group__head">
              <h2 className="wl-group__title">
                {meta.title}
                <span className="wl-group__count">{items.length}</span>
              </h2>
              <p className="wl-group__blurb">{meta.blurb}</p>
            </header>

            <div className="wl-group__items">
              {items.map((item) => (
                <WishlistFitCard
                  key={item.product.id}
                  item={item}
                  resolved={resolvedIds.has(item.product.id)}
                  onAddToBag={handleAddToBag}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
