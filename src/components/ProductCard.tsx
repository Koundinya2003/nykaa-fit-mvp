import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import ProductImageView from './ProductImage';
import PriceBlock from './PriceBlock';
import Rating from './Rating';
import WishlistButton from './WishlistButton';
import '@/styles/product.css';

interface Props {
  product: Product;
  /** Compact cards are used inside carousels and the bag's "you may also like". */
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: Props) {
  const [hovered, setHovered] = useState(false);
  const [activeColor, setActiveColor] = useState(product.colors[0].name);

  const soldOut = product.availability === 'out-of-stock';
  const badge = soldOut
    ? { label: 'Sold Out', tone: 'muted' }
    : product.availability === 'low-stock'
      ? { label: 'Few Left', tone: 'warning' }
      : product.tags.includes('bestseller')
        ? { label: 'Bestseller', tone: 'accent' }
        : product.tags.includes('trending')
          ? { label: 'Trending', tone: 'ink' }
          : null;

  return (
    <article
      className={`card ${compact ? 'card--compact' : ''} ${soldOut ? 'is-soldout' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/p/${product.id}`} className="card__media" aria-label={`${product.brand} ${product.name}`}>
        <ProductImageView
          product={product}
          colorName={activeColor}
          view={hovered ? 'styled' : 'front'}
          className="card__img"
        />
        {badge && <span className={`card__badge card__badge--${badge.tone}`}>{badge.label}</span>}
      </Link>

      <WishlistButton product={product} />

      <div className="card__body">
        <p className="card__brand">{product.brand}</p>
        <Link to={`/p/${product.id}`} className="card__name">
          {product.name}
        </Link>
        <PriceBlock price={product.price} mrp={product.mrp} discount={product.discount} />
        <div className="card__meta">
          <Rating value={product.rating} count={product.reviewCount} />
        </div>

        {product.colors.length > 1 && !compact && (
          <div className="card__colors" role="group" aria-label="Available colours">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-label={`Preview in ${c.name}`}
                aria-pressed={activeColor === c.name}
                className={`card__swatch ${activeColor === c.name ? 'is-active' : ''}`}
                style={{ background: c.hex }}
                onClick={() => setActiveColor(c.name)}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
