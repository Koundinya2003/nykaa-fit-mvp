import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { getProductById } from '@/data/products';
import { formatINR } from '@/utils/format';
import PriceSummaryCard from '@/components/PriceSummaryCard';
import ProductImageView from '@/components/ProductImage';
import Breadcrumbs from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import { CheckIcon } from '@/components/Icons';
import {
  FitOutcomePrompt,
  getFitProfile,
  recommendForProduct,
  track,
  trackOnce,
} from '@/features/nykaa-fit';
import '@/styles/bag.css';

/** Checkout is intentionally a review-and-confirm step: this MVP has no
 *  payment integration, and the page says so rather than mimicking one. */
export default function CheckoutPage() {
  const { bag, summary, clearBag } = useShop();
  const navigate = useNavigate();
  const [placed, setPlaced] = useState<{
    id: string;
    total: number;
    lines: typeof bag;
    /** What Nykaa Fit had recommended per product at the time of the order,
     *  captured before the bag is cleared. */
    recommended: Record<string, string | null>;
  } | null>(null);

  const lines = bag
    .map((line) => ({ line, product: getProductById(line.productId) }))
    .filter((e): e is { line: typeof e.line; product: NonNullable<typeof e.product> } =>
      Boolean(e.product),
    );

  // Guardrail metric: the gap between checkout_started and purchase is
  // checkout abandonment, which has to be watched in case fit guidance moves
  // conversion by pushing uncertain shoppers further down the funnel.
  const lineCount = lines.length;
  useEffect(() => {
    if (lineCount === 0 || placed) return;
    trackOnce(`checkout_started:${bag.map((l) => l.key).join('|')}`, 'checkout_started', {
      quantity: summary.itemCount,
      value: summary.payable,
    });
  }, [lineCount, placed, bag, summary.itemCount, summary.payable]);

  if (placed) {
    return (
      <div className="page section confirm">
        <span className="confirm__tick">
          <CheckIcon size={30} />
        </span>
        <h1 className="display confirm__title">Order placed</h1>
        <p className="confirm__body">
          Order <strong>{placed.id}</strong> for {formatINR(placed.total)} has been recorded.
        </p>
        <p className="confirm__note">
          This is a prototype — no payment was taken and nothing will be shipped.
        </p>

        {/* The loop that closes the feature: whether the size was right is
            the only thing browsing behaviour cannot tell us. */}
        <FitOutcomePrompt
          orderId={placed.id}
          lines={placed.lines}
          recommendedByProduct={placed.recommended}
        />

        <div className="confirm__actions">
          <Link to="/" className="btn btn--primary btn--sm">
            Back to home
          </Link>
          <Link to="/wishlist" className="btn btn--ghost btn--sm">
            Back to wishlist
          </Link>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="page">
        <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Checkout' }]} />
        <EmptyState
          title="Nothing to check out"
          body="Your bag is empty, so there is no order to review."
          ctaLabel="Start shopping"
          ctaTo="/c/women"
        />
      </div>
    );
  }

  const placeOrder = () => {
    const id = `NF${Date.now().toString().slice(-8)}`;
    const profile = getFitProfile();
    const recommended: Record<string, string | null> = {};

    // One purchase event per line, so conversion can be attributed back to the
    // product (and to whether Nykaa Fit picked the size).
    lines.forEach(({ line, product }) => {
      const rec = profile ? recommendForProduct(profile, product) : null;
      const recommendedSize = rec && !rec.confidence.withheld ? rec.recommendedSize : null;
      recommended[product.id] = recommendedSize;

      track('purchase', {
        order_id: id,
        product_id: product.id,
        brand: product.brand,
        category: product.subcategory,
        selected_size: line.size,
        recommended_size: recommendedSize,
        changed_from_recommendation:
          recommendedSize !== null && line.size !== recommendedSize,
        confidence_level: rec?.confidence.level,
        fit_profile_used: Boolean(profile),
        quantity: line.quantity,
        value: product.price * line.quantity,
      });
    });

    // The bag is cleared below, so the lines the outcome prompt asks about
    // are captured here rather than read back off the emptied bag.
    setPlaced({
      id,
      total: summary.payable,
      lines: lines.map(({ line }) => line),
      recommended,
    });
    clearBag();
  };

  return (
    <div className="page bag">
      <Breadcrumbs
        trail={[{ label: 'Home', to: '/' }, { label: 'Bag', to: '/bag' }, { label: 'Checkout' }]}
      />

      <header className="bag__head">
        <h1 className="display bag__title">Checkout</h1>
        <button type="button" className="bag__clear" onClick={() => navigate('/bag')}>
          Back to bag
        </button>
      </header>

      <p className="checkout__notice">
        Payment is out of scope for this MVP. Review your order below and confirm to see the
        order-placed state — no payment method is collected.
      </p>

      <div className="bag__layout">
        <div className="checkout__review">
          <h2 className="checkout__section-title">Order Review</h2>
          <ul className="checkout__lines">
            {lines.map(({ line, product }) => (
              <li key={line.key} className="checkout__line">
                <span className="checkout__thumb">
                  <ProductImageView product={product} colorName={line.colorName} view="front" />
                </span>
                <span className="checkout__line-body">
                  <span className="checkout__line-brand">{product.brand}</span>
                  <span className="checkout__line-name">{product.name}</span>
                  <span className="checkout__line-meta">
                    Size {line.size} · {line.colorName} · Qty {line.quantity}
                  </span>
                </span>
                <span className="checkout__line-price">
                  {formatINR(product.price * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <h2 className="checkout__section-title">Delivery</h2>
          <div className="checkout__address">
            <p className="checkout__address-name">Sample Address</p>
            <p>
              Flat 402, Prestige Residency, Indiranagar
              <br />
              Bengaluru, Karnataka — 560038
            </p>
            <p className="checkout__address-note">
              Address entry is not part of this MVP scope.
            </p>
          </div>
        </div>

        <PriceSummaryCard summary={summary}>
          <button type="button" className="btn btn--accent btn--block summary__cta" onClick={placeOrder}>
            Place Order
          </button>
          <Link to="/bag" className="summary__continue">
            Back to bag
          </Link>
        </PriceSummaryCard>
      </div>
    </div>
  );
}
