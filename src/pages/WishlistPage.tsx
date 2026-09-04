import { useShop } from '@/context/ShopContext';
import { getProductById } from '@/data/products';
import ProductGrid from '@/components/ProductGrid';
import Breadcrumbs from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import '@/styles/listing.css';

export default function WishlistPage() {
  const { wishlist } = useShop();
  const products = wishlist.map(getProductById).filter((p) => p !== undefined);

  return (
    <div className="page listing">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />

      <header className="listing__head">
        <div>
          <h1 className="display listing__title">Wishlist</h1>
          <p className="listing__tagline">Saved pieces, kept across visits</p>
        </div>
        <p className="listing__count">
          {products.length} {products.length === 1 ? 'item' : 'items'}
        </p>
      </header>

      <div className="listing__results" style={{ paddingTop: 'var(--s-6)' }}>
        <ProductGrid
          products={products}
          columns={4}
          emptyState={
            <EmptyState
              title="Your wishlist is empty"
              body="Tap the heart on any product to keep it here. Your wishlist is saved on this device."
              ctaLabel="Browse the catalogue"
              ctaTo="/c/women"
            />
          }
        />
      </div>
    </div>
  );
}
