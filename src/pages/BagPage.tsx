import { Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { PRODUCTS, getProductById } from '@/data/products';
import { applySort } from '@/utils/catalogue';
import BagItemRow from '@/components/BagItem';
import PriceSummaryCard from '@/components/PriceSummaryCard';
import RecommendationCarousel from '@/components/RecommendationCarousel';
import Breadcrumbs from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import '@/styles/bag.css';

export default function BagPage() {
  const { bag, summary, clearBag } = useShop();

  // A line whose product vanished from the catalogue is skipped rather than
  // crashing the page — cheap insurance against stale localStorage.
  const lines = bag
    .map((line) => ({ line, product: getProductById(line.productId) }))
    .filter((entry): entry is { line: typeof entry.line; product: NonNullable<typeof entry.product> } =>
      Boolean(entry.product),
    )
    .sort((a, b) => b.line.addedAt - a.line.addedAt);

  const suggestions = applySort(PRODUCTS, 'rating')
    .filter((p) => !bag.some((l) => l.productId === p.id))
    .slice(0, 10);

  if (lines.length === 0) {
    return (
      <div className="page">
        <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Shopping Bag' }]} />
        <EmptyState
          title="Your bag is empty"
          body="Nothing here yet. Browse the edit and add something you will actually wear."
          ctaLabel="Start shopping"
          ctaTo="/c/women"
        />
        <div className="section--tight">
          <RecommendationCarousel
            title="Highest Rated Right Now"
            products={suggestions}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page bag">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Shopping Bag' }]} />

      <header className="bag__head">
        <h1 className="display bag__title">Shopping Bag</h1>
        <button type="button" className="bag__clear" onClick={clearBag}>
          Clear bag
        </button>
      </header>

      <div className="bag__layout">
        <div className="bag__lines">
          {lines.map(({ line, product }) => (
            <BagItemRow key={line.key} line={line} product={product} />
          ))}
        </div>

        <PriceSummaryCard summary={summary}>
          <Link to="/checkout" className="btn btn--accent btn--block summary__cta">
            Proceed to Checkout
          </Link>
          <Link to="/c/women" className="summary__continue">
            Continue shopping
          </Link>
        </PriceSummaryCard>
      </div>

      <div className="section--tight">
        <RecommendationCarousel title="You May Also Like" products={suggestions} />
      </div>
    </div>
  );
}
