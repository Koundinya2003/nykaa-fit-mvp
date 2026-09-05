import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { getProductById } from '@/data/products';
import Breadcrumbs from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import { RulerIcon, CheckIcon } from '@/components/Icons';
import {
  WishlistFitCard,
  resolveWishlist,
  useFitProfile,
  useFitEnabled,
  useResolutions,
  isResolved,
  markResolved,
  track,
  trackOnce,
  DEMO_ITEM_COUNT,
  DEMO_BRAND_COUNT,
  WISHLIST_WINDOW_DAYS,
  type ResolvedWishlistItem,
} from '@/features/nykaa-fit';
import '@/styles/wishlist.css';

/* =========================================================================
   The wishlist.

   This page is the whole argument. A wishlist is a queue of unresolved
   questions, and the only one that never resolves itself is "will this fit?"
   — a price question answers itself when the sale lands, but nobody's saved
   Kazo dress spontaneously becomes a known size.

   So the page does one thing: answer that question for every saved item in a
   single pass, and then sort the list by what the shopper has to do next.
   ========================================================================= */

/** How long the resolve pass is animated for. Long enough to read as work
 *  being done across the list, short enough not to be in the way. */
const RESOLVE_ANIMATION_MS = 650;

export default function WishlistPage() {
  const { wishlist, addToBag } = useShop();
  const profile = useFitProfile();
  const fitEnabled = useFitEnabled();
  const resolutions = useResolutions();
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

  const resolution = useMemo(
    () => resolveWishlist(entries, profile),
    [entries, profile],
  );

  const profileVersion = profile?.updatedAt ?? 0;

  /** Items already answered against the CURRENT profile. Editing the profile
   *  invalidates every stored answer, because they are no longer the answers. */
  const resolvedIds = useMemo(() => {
    void resolutions; // Re-derive whenever a pass records new resolutions.
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
    });
  }, [entries.length, profile, profileVersion]);

  /**
   * The one wishlist-level action. Runs the recommender across every saved
   * item in one pass and logs each answer, so the funnel can show how many
   * saved items had their fit question resolved.
   */
  const resolveAll = useCallback(() => {
    if (!profile || entries.length === 0) return;
    setResolving(true);

    const items = resolveWishlist(entries, profile).items;

    track('wishlist_resolve_all', {
      item_count: items.length,
      input_method: profile.method,
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
        match_quality: item.recommendation?.matchQuality,
        wishlist_group: item.group,
        days_saved: item.daysSaved,
        in_stock: item.inStock,
        input_method: profile.method,
        fit_profile_used: true,
      });
    });

    markResolved(
      entries.map((e) => e.entry.productId),
      profile.updatedAt,
    );

    window.setTimeout(() => setResolving(false), RESOLVE_ANIMATION_MS);
  }, [entries, profile]);

  // /demo lands here with ?resolve=1 so an evaluator sees the finished state
  // in one click rather than having to know to press the button.
  useEffect(() => {
    if (params.get('resolve') !== '1') return;
    if (profile && entries.length > 0) resolveAll();
    const next = new URLSearchParams(params);
    next.delete('resolve');
    setParams(next, { replace: true });
  }, [params, setParams, profile, entries.length, resolveAll]);

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

  if (entries.length === 0) {
    return (
      <div className="page wishlist">
        <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />
        <EmptyState
          title="Your wishlist is empty"
          body="Tap the heart on any product to keep it here. Your wishlist is saved on this device."
          ctaLabel="Browse the catalogue"
          ctaTo="/c/women"
        />
        <p className="wl-empty-demo">
          Short on time? <Link to="/demo">Run the evaluator walkthrough</Link> — it seeds a profile
          and {DEMO_ITEM_COUNT} saved items across {DEMO_BRAND_COUNT} brands.
        </p>
      </div>
    );
  }

  const eligibleCount = entries.filter(
    ({ product }) => product.subcategory === 'dresses' && product.gender === 'women',
  ).length;

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

        {fitEnabled && profile && (
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
                <CheckIcon size={14} /> Every saved item has been sized against your profile
              </p>
            )}
            {!allResolved && !resolving && (
              <p className="wl-resolve__sub">
                {unresolvedCount} {unresolvedCount === 1 ? 'item has' : 'items have'} an
                unanswered fit question
              </p>
            )}
          </div>
        )}
      </header>

      {/* ---- Empty profile: the paid-once, reused-everywhere promise ---- */}
      {fitEnabled && !profile && (
        <section className="wl-prompt">
          <p className="wl-prompt__eyebrow">
            <RulerIcon size={15} /> Nykaa Fit
          </p>
          <h2 className="wl-prompt__title">
            Answer 4 questions once and we&rsquo;ll size all {entries.length} saved{' '}
            {entries.length === 1 ? 'item' : 'items'}
          </h2>
          <p className="wl-prompt__body">
            Bust, waist, hip and height. You give them once, on this device, and every saved item
            gets a size against the brand that made it — {eligibleCount} of these{' '}
            {eligibleCount === 1 ? 'is' : 'are'} in a category we cover today. Nothing is uploaded.
          </p>
          <div className="wl-prompt__actions">
            <Link to="/demo" className="btn btn--accent">
              Set up my fit profile
            </Link>
            <Link to={`/p/${entries[0].product.id}`} className="btn btn--ghost">
              Or start from a product
            </Link>
          </div>
        </section>
      )}

      {/* ---- Not yet resolved: make the action obvious ---- */}
      {fitEnabled && profile && !allResolved && !resolving && (
        <p className="wl-hint">
          Your fit profile is saved. Run one pass and every item below is sorted by what you have
          to do next.
        </p>
      )}

      {/* ---- The measured-path payoff, stated where it is felt ----
          An estimated body cannot reach "confirmed", so this list has no
          ready-to-buy group at all until real measurements arrive. That is
          the argument for asking for them, made concrete rather than
          asserted. */}
      {fitEnabled && profile?.method === 'estimated' && allResolved && (
        <p className="wl-hint wl-hint--upgrade">
          Your measurements are estimated from height and weight, so nothing here can be
          confirmed — every sized item sits under &ldquo;Needs a decision&rdquo;.{' '}
          <Link to={`/p/${entries[0].product.id}`}>Add your bust, waist and hip</Link> and the
          items we are sure about move up to &ldquo;Ready to buy&rdquo;.
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
