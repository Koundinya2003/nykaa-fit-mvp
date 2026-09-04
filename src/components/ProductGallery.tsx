import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/types';
import ProductImageView from './ProductImage';
import { ChevronLeft, ChevronRight } from './Icons';
import '@/styles/pdp.css';

interface Props {
  product: Product;
  colorName: string;
}

/** Thumbnail rail + main frame. The image set is scoped to the selected
 *  colourway, so changing colour genuinely changes the photography. */
export default function ProductGallery({ product, colorName }: Props) {
  const shots = useMemo(
    () => product.images.filter((i) => i.colorName === colorName),
    [product.images, colorName],
  );
  const [index, setIndex] = useState(0);

  // Reset to the first shot whenever the colourway changes.
  useEffect(() => setIndex(0), [colorName]);

  const active = shots[index] ?? shots[0];
  const move = (dir: 1 | -1) => setIndex((i) => (i + dir + shots.length) % shots.length);

  return (
    <div className="gallery">
      <div className="gallery__thumbs" role="tablist" aria-label="Product images">
        {shots.map((shot, i) => (
          <button
            key={shot.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={shot.alt}
            className={`gallery__thumb ${i === index ? 'is-active' : ''}`}
            onClick={() => setIndex(i)}
            onMouseEnter={() => setIndex(i)}
          >
            <ProductImageView product={product} colorName={colorName} view={shot.view} />
          </button>
        ))}
      </div>

      <div className="gallery__main">
        <ProductImageView
          product={product}
          colorName={colorName}
          view={active?.view ?? 'front'}
          className="gallery__img"
        />

        {product.availability === 'out-of-stock' && (
          <span className="gallery__soldout">Sold Out</span>
        )}

        <button
          type="button"
          className="gallery__arrow gallery__arrow--prev"
          aria-label="Previous image"
          onClick={() => move(-1)}
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          className="gallery__arrow gallery__arrow--next"
          aria-label="Next image"
          onClick={() => move(1)}
        >
          <ChevronRight />
        </button>

        <p className="gallery__counter" aria-hidden>
          {index + 1} / {shots.length}
        </p>
      </div>
    </div>
  );
}
