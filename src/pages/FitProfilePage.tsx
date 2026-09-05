import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { getProductById, PRODUCTS } from '@/data/products';
import Breadcrumbs from '@/components/Breadcrumbs';
import { RulerIcon, ShieldIcon, CheckIcon } from '@/components/Icons';
import type { FitProfile } from '@/features/nykaa-fit';
import {
  FitProfileForm,
  clearFitProfile,
  isFitEligible,
  recommendForProduct,
  saveFitProfile,
  track,
  useFitProfile,
  MEASUREMENT_KEYS,
  MEASUREMENT_LABEL,
} from '@/features/nykaa-fit';
import '@/styles/fit-profile.css';

/* =========================================================================
   /fit-profile — the profile as something the shopper owns.

   Previously the only way to create or edit a profile was a modal buried on
   a product page, which framed it as a step in one purchase rather than as
   a thing she keeps. It is the opposite: three measurements entered once
   and reused on every brand forever, which is the entire value proposition.

   So it gets a page, a place in the header, and — more importantly — a live
   preview. Typing a waist measurement and watching eight saved items
   re-size in front of you is a better argument for entering it than any
   amount of copy about why we ask.
   ========================================================================= */

export default function FitProfilePage() {
  const saved = useFitProfile();
  const { wishlist } = useShop();
  const navigate = useNavigate();
  const [justSaved, setJustSaved] = useState(false);

  /** Draft state drives the preview; it is not persisted until she saves. */
  const [preview, setPreview] = useState<Omit<FitProfile, 'createdAt' | 'updatedAt'> | null>(null);

  const previewProfile: FitProfile | null = useMemo(() => {
    const source = preview ?? saved;
    if (!source) return null;
    return { ...source, createdAt: saved?.createdAt ?? 0, updatedAt: saved?.updatedAt ?? 0 };
  }, [preview, saved]);

  /** What her saved dresses would be sized as with the numbers on screen.
   *  Falls back to the catalogue so a new shopper still sees the point. */
  const previewRows = useMemo(() => {
    if (!previewProfile || Object.keys(previewProfile.measurements).length === 0) return [];

    const savedEligible = wishlist
      .map((e) => getProductById(e.productId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p) && isFitEligible(p!));

    const source = savedEligible.length > 0 ? savedEligible : PRODUCTS.filter(isFitEligible);

    return source.slice(0, 6).map((product) => {
      const rec = recommendForProduct(previewProfile, product);
      return {
        product,
        size: rec && !rec.confidence.withheld ? rec.recommendedSize : null,
        level: rec?.confidence.level ?? 'low',
        fromWishlist: savedEligible.length > 0,
      };
    });
  }, [previewProfile, wishlist]);

  const handleChange = useCallback((draft: Omit<FitProfile, 'createdAt' | 'updatedAt'>) => {
    setPreview(draft);
  }, []);

  const handleSubmit = (input: Omit<FitProfile, 'createdAt' | 'updatedAt'>) => {
    const wasExisting = Boolean(saved);
    saveFitProfile(input);
    track(wasExisting ? 'fit_profile_completed' : 'fit_profile_completed', {
      profile_origin: wasExisting ? 'edited' : 'new',
      measurements_given: Object.keys(input.measurements).length,
      reason: 'profile_page',
    });
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2600);
  };

  const handleClear = () => {
    clearFitProfile();
    setPreview(null);
    track('fit_profile_cleared', { reason: 'profile_page' });
  };

  const distinctSizes = new Set(previewRows.map((r) => r.size).filter(Boolean)).size;

  return (
    <div className="page fitprofile">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Fit profile' }]} />

      <header className="fitprofile__head">
        <div>
          <p className="fitprofile__eyebrow">
            <RulerIcon size={15} /> Nykaa Fit
          </p>
          <h1 className="display fitprofile__title">Your fit profile</h1>
          <p className="fitprofile__lede">
            Three measurements, entered once and reused on every brand you shop. We compare them
            against each brand&rsquo;s own published size chart — that is the whole method, and it
            is the only thing that goes into your recommendation.
          </p>
        </div>
        {saved && (
          <p className="fitprofile__saved-at">
            Saved on this device ·{' '}
            {new Date(saved.updatedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
      </header>

      <div className="fitprofile__layout">
        <div className="fitprofile__form">
          <FitProfileForm
            existing={saved}
            onSubmit={handleSubmit}
            onChange={handleChange}
            showCancel={false}
            submitLabel={saved ? 'Save changes' : 'Save my fit profile'}
          />

          {justSaved && (
            <p className="fitprofile__flash" role="status">
              <CheckIcon size={14} /> Saved. Every product and your whole wishlist now use these
              numbers.
            </p>
          )}

          {saved && (
            <div className="fitprofile__danger">
              <button type="button" className="fit-link" onClick={handleClear}>
                Delete my fit profile
              </button>
              <p>
                Removes it from this device immediately. There is no copy anywhere else, because
                it was never sent anywhere.
              </p>
            </div>
          )}
        </div>

        {/* ---- Live preview ---- */}
        <aside className="fitprofile__preview" aria-live="polite">
          <h2 className="fitprofile__preview-title">
            {previewRows.length > 0 && previewRows[0].fromWishlist
              ? 'Your saved items with these numbers'
              : 'What these numbers mean across brands'}
          </h2>

          {previewRows.length === 0 ? (
            <p className="fitprofile__preview-empty">
              Enter at least one measurement and this fills in — you&rsquo;ll see your size on
              every brand at once, before you save anything.
            </p>
          ) : (
            <>
              <ul className="fitprofile__rows">
                {previewRows.map((row) => (
                  <li key={row.product.id} className="fitprofile__row">
                    <span
                      className={`fitprofile__size ${row.size ? '' : 'is-none'} is-${row.level}`}
                    >
                      {row.size ?? '—'}
                    </span>
                    <Link to={`/p/${row.product.id}`} className="fitprofile__meta">
                      <span className="fitprofile__brand">{row.product.brand}</span>
                      <span className="fitprofile__name">{row.product.name}</span>
                    </Link>
                    <span className="fitprofile__level">
                      {row.size ? `${row.level} confidence` : 'not enough to say'}
                    </span>
                  </li>
                ))}
              </ul>

              {distinctSizes > 1 && (
                <p className="fitprofile__insight">
                  {distinctSizes} different sizes for one body — because these brands publish
                  different charts. That gap is what the profile is for.
                </p>
              )}
            </>
          )}

          <div className="fitprofile__privacy">
            <ShieldIcon size={16} />
            <div>
              <p className="fitprofile__privacy-title">Where this goes</p>
              <p>
                Into this browser&rsquo;s local storage and nowhere else. This feature makes no
                network calls at all, so nothing can be uploaded even accidentally. Clearing your
                browser data removes it.
              </p>
            </div>
          </div>

          <div className="fitprofile__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => navigate('/wishlist')}
            >
              Go to my wishlist
            </button>
          </div>
        </aside>
      </div>

      <section className="fitprofile__method">
        <h2 className="fitprofile__method-title">How your size is worked out</h2>
        <ol className="fitprofile__steps">
          <li>
            <strong>Your measurements.</strong> Only the ones you enter. Anything you leave blank
            is left blank — we never estimate a measurement from your height, your weight or
            anything else.
          </li>
          <li>
            <strong>The room you want.</strong> The garment&rsquo;s cut plus your preferred fit,
            added together in inches. Both are shown to you on every recommendation.
          </li>
          <li>
            <strong>The brand&rsquo;s published chart.</strong> We find the size that brand cuts
            closest to your measurements plus that room. Different brands, different charts,
            different letters.
          </li>
          <li>
            <strong>A confidence check.</strong> If you are between two sizes, or we only have one
            measurement to go on, we say so and show you the chart instead of guessing.
          </li>
        </ol>
        <p className="fitprofile__method-note">
          What never enters it: other shoppers&rsquo; reviews or ratings, any estimate of your
          body, and anything from outside this browser.{' '}
          <Link to="/metrics">See what we measure</Link>.
        </p>
      </section>

      <p className="fitprofile__foot">
        Nykaa Fit currently covers women&rsquo;s dresses —{' '}
        {PRODUCTS.filter(isFitEligible).length} products across{' '}
        {new Set(PRODUCTS.filter(isFitEligible).map((p) => p.brand)).size} brands. Measurements you
        enter now apply automatically as it widens.{' '}
        {MEASUREMENT_KEYS.map((k) => MEASUREMENT_LABEL[k]).join(', ')} are the three the charts are
        written in.
      </p>
    </div>
  );
}
