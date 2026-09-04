import type { Product } from '@/types';
import ProductCard from './ProductCard';
import '@/styles/product.css';

interface Props {
  products: Product[];
  columns?: 3 | 4 | 5;
  loading?: boolean;
  emptyState?: React.ReactNode;
}

export default function ProductGrid({ products, columns = 4, loading = false, emptyState }: Props) {
  if (loading) {
    return (
      <div className={`grid grid--${columns}`} aria-busy="true" aria-label="Loading products">
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <div key={i} className="card card--skeleton">
            <div className="skeleton card__media" />
            <div className="card__body">
              <div className="skeleton" style={{ height: 12, width: '40%' }} />
              <div className="skeleton" style={{ height: 14, width: '80%', marginTop: 8 }} />
              <div className="skeleton" style={{ height: 16, width: '55%', marginTop: 10 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return <>{emptyState}</>;

  return (
    <div className={`grid grid--${columns}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
