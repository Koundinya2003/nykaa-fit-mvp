import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { PRODUCTS, getProductById } from '@/data/products';
import { breadcrumbsFor } from '@/data/categories';
import { relatedProducts } from '@/utils/catalogue';
import { formatINR } from '@/utils/format';
import { useShop } from '@/context/ShopContext';
import Breadcrumbs from '@/components/Breadcrumbs';
import ProductGallery from '@/components/ProductGallery';
import SizeSelector from '@/components/SizeSelector';
import SizeChart from '@/components/SizeChart';
import {
  FitBlock,
  isFitEligible,
  track,
  trackOnce,
  useFitRecommendation,
} from '@/features/nykaa-fit';
import ProductInfo from '@/components/ProductInfo';
import DeliveryCheck from '@/components/DeliveryCheck';
import Reviews from '@/components/Reviews';
import RecommendationCarousel from '@/components/RecommendationCarousel';
import WishlistButton from '@/components/WishlistButton';
import Rating from '@/components/Rating';
import NotFoundPage from './NotFoundPage';
import { BagIcon } from '@/components/Icons';
import { contrastInk } from '@/utils/color';
import '@/styles/pdp.css';

export default function ProductDetailPage() {
  const { productId } = useParams();
  const product = getProductById(productId);
  const { addToBag } = useShop();
  /** Stable per navigation entry — used to fire view events exactly once. */
  const viewKey = useLocation().key;

  const [colorName, setColorName] = useState(product?.colors[0].name ?? '');
  const [size, setSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  /** Whether the selected size came from Nykaa Fit or was chosen by hand —
   *  carried into the size_selected and add_to_bag events. */
  const [sizeSource, setSizeSource] = useState<'recommended' | 'manual' | null>(null);
  const sizeRef = useRef<HTMLDivElement>(null);

  const fit = useFitRecommendation(product);

  // Navigating between products (e.g. from the recommendations rail) must
  // reset the variant state, otherwise the previous colour/size leaks across.
  useEffect(() => {
    if (!product) return;
    setColorName(product.colors[0].name);
    setSize(null);
    setSizeError(false);
    setSizeSource(null);
  }, [product]);

  // Entry point of the funnel. Fires for control and treatment alike, so the
  // product-view -> add-to-bag conversion can be compared between buckets.
  useEffect(() => {
    if (!product) return;
    trackOnce(`product_view:${viewKey}:${product.id}`, 'product_view', {
      product_id: product.id,
      brand: product.brand,
      category: product.subcategory,
      fit_eligible: isFitEligible(product),
      value: product.price,
    });
  }, [product, viewKey]);

  const related = useMemo(
    () => (product ? relatedProducts(PRODUCTS, product, 10) : []),
    [product],
  );

  if (!product) return <NotFoundPage />;

  const soldOut = product.availability === 'out-of-stock';

  const handleSelectSize = (next: string, source: 'recommended' | 'manual') => {
    setSize(next);
    setSizeSource(source);
    setSizeError(false);

    const recommended = fit.recommendation?.recommendedSize ?? null;

    track('size_selected', {
      product_id: product.id,
      brand: product.brand,
      category: product.subcategory,
      selected_size: next,
      recommended_size: recommended,
      match_quality: fit.recommendation?.matchQuality,
      size_source: source,
      changed_from_recommendation: recommended !== null && next !== recommended,
      fit_profile_used: Boolean(fit.recommendation),
    });

    // The signal that separates "used the feature" from "was persuaded by
    // it": a shopper who saw a recommendation and then chose something else.
    if (source === 'manual' && recommended !== null && next !== recommended) {
      track('size_changed_after_recommendation', {
        product_id: product.id,
        brand: product.brand,
        category: product.subcategory,
        recommended_size: recommended,
        selected_size: next,
        match_quality: fit.recommendation?.matchQuality,
        fit_profile_used: true,
      });
    }
  };

  const handleAdd = () => {
    if (!size) {
      setSizeError(true);
      sizeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      track('add_to_bag', {
        product_id: product.id,
        reason: 'blocked_no_size',
        fit_eligible: fit.eligible,
      });
      return;
    }
    const recommended = fit.recommendation?.recommendedSize ?? null;
    addToBag(product, size, colorName);
    track('add_to_bag', {
      product_id: product.id,
      brand: product.brand,
      category: product.subcategory,
      selected_size: size,
      recommended_size: recommended,
      match_quality: fit.recommendation?.matchQuality,
      size_source: sizeSource ?? 'manual',
      changed_from_recommendation: recommended !== null && size !== recommended,
      fit_profile_used: Boolean(fit.recommendation),
      fit_eligible: fit.eligible,
      value: product.price,
      quantity: 1,
    });
  };

  return (
    <div className="page pdp">
      <Breadcrumbs trail={breadcrumbsFor(product)} />

      <div className="pdp__layout">
        <div className="pdp__media">
          <ProductGallery product={product} colorName={colorName} />
        </div>

        <div className="pdp__buy">
          <header className="pdp__head">
            <p className="pdp__brand">{product.brand}</p>
            <h1 className="pdp__name">{product.name}</h1>
            <a href="#reviews" className="pdp__rating">
              <Rating value={product.rating} count={product.reviewCount} />
              <span className="pdp__rating-link">Read reviews</span>
            </a>
          </header>

          <div className="pdp__price">
            <span className="pdp__price-now">{formatINR(product.price)}</span>
            <span className="pdp__price-mrp">{formatINR(product.mrp)}</span>
            <span className="pdp__price-off">{product.discount}% off</span>
          </div>
          <p className="pdp__tax">Inclusive of all taxes</p>

          {product.availability === 'low-stock' && (
            <p className="pill pill--warning pdp__stock">Only a few left</p>
          )}
          {soldOut && <p className="pill pill--danger pdp__stock">Out of stock</p>}

          {/* ---- Colour ---- */}
          <section className="colors" aria-labelledby="color-heading">
            <h2 id="color-heading" className="colors__title">
              Colour: <span>{colorName}</span>
            </h2>
            <div className="colors__row" role="radiogroup" aria-label="Colour">
              {product.colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={c.name === colorName}
                  aria-label={c.name}
                  title={c.name}
                  className={`color-chip ${c.name === colorName ? 'is-active' : ''}`}
                  style={{ background: c.hex, color: contrastInk(c.hex) }}
                  onClick={() => setColorName(c.name)}
                />
              ))}
            </div>
          </section>

          <div ref={sizeRef}>
            <SizeSelector
              product={product}
              selected={size}
              error={sizeError}
              recommendedSize={fit.recommendation?.recommendedSize ?? null}
              onSelect={(s) => handleSelectSize(s, 'manual')}
              onOpenChart={() => setChartOpen(true)}
            />

            {/* Nykaa Fit sits directly under the size selector, inside the
                purchase panel. It renders nothing in the control bucket or on
                ineligible products, and the selector above works with or
                without it. */}
            <FitBlock
              product={product}
              state={fit}
              viewKey={viewKey}
              selectedSize={size}
              onSelectSize={handleSelectSize}
              onOpenSizeChart={() => setChartOpen(true)}
            />
          </div>

          <div className="pdp__cta">
            <button
              type="button"
              className="btn btn--accent btn--block"
              onClick={handleAdd}
              disabled={soldOut}
            >
              <BagIcon size={18} />
              {soldOut ? 'Sold Out' : 'Add to Bag'}
            </button>
            <WishlistButton product={product} variant="inline" />
          </div>

          <DeliveryCheck />
          <ProductInfo product={product} />
        </div>
      </div>

      <Reviews product={product} />

      <div className="pdp__related">
        <RecommendationCarousel
          title="You May Also Like"
          subtitle={`More from ${product.subcategory === 'shoes' ? 'footwear' : product.subcategory}`}
          products={related}
        />
      </div>

      <SizeChart
        product={product}
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        selectedSize={size}
      />

      {/* Sticky purchase bar on small screens. */}
      <div className="pdp__sticky">
        <div className="pdp__sticky-info">
          <p className="pdp__sticky-price">{formatINR(product.price)}</p>
          <p className="pdp__sticky-size">{size ? `Size ${size}` : 'Select a size'}</p>
        </div>
        <button
          type="button"
          className="btn btn--accent"
          onClick={handleAdd}
          disabled={soldOut}
        >
          {soldOut ? 'Sold Out' : 'Add to Bag'}
        </button>
      </div>
    </div>
  );
}
