import type { Product } from '@/types';
import { CheckIcon, RulerIcon } from './Icons';
import '@/styles/pdp.css';

interface Props {
  product: Product;
  selected: string | null;
  onSelect: (size: string) => void;
  onOpenChart: () => void;
  /** Set when the shopper tried to add to bag without choosing a size. */
  error?: boolean;
  /** Marked by Nykaa Fit when a recommendation exists. Purely a hint — the
   *  shopper can still pick any other size. */
  recommendedSize?: string | null;
}

/** The most important control on the PDP — deliberately given its own panel,
 *  a large hit area per size, and an explicit sold-out treatment. */
export default function SizeSelector({
  product,
  selected,
  onSelect,
  onOpenChart,
  error,
  recommendedSize = null,
}: Props) {
  const isDenim = product.subcategory === 'jeans';
  const isShoes = product.subcategory === 'shoes';
  const label = isShoes ? 'Select Size (UK)' : isDenim ? 'Select Waist Size' : 'Select Size';

  return (
    <section className={`sizes ${error ? 'has-error' : ''}`} aria-labelledby="size-heading">
      <div className="sizes__head">
        <h2 id="size-heading" className="sizes__title">
          {label}
        </h2>
        <button type="button" className="sizes__chart-link" onClick={onOpenChart}>
          <RulerIcon size={16} />
          Size Guide
        </button>
      </div>

      <div className="sizes__grid" role="radiogroup" aria-label={label}>
        {product.sizes.map((size) => {
          const soldOut = product.soldOutSizes.includes(size);
          const active = selected === size;
          const recommended = size === recommendedSize;
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={soldOut}
              aria-label={
                soldOut
                  ? `${size} — sold out`
                  : recommended
                    ? `${size} — recommended for you`
                    : size
              }
              className={`size-chip ${active ? 'is-active' : ''} ${soldOut ? 'is-soldout' : ''} ${
                recommended ? 'is-recommended' : ''
              }`}
              onClick={() => onSelect(size)}
            >
              {size}
            </button>
          );
        })}
      </div>

      {recommendedSize && (
        <p className="sizes__recommended">
          <CheckIcon size={14} />
          {recommendedSize} is your recommended size
        </p>
      )}

      {error && (
        <p className="sizes__error" role="alert">
          Please select a size to continue
        </p>
      )}

      <p className="sizes__fit">
        <strong>{product.fit}</strong>
        <span> · Model wears size {product.sizes[Math.floor(product.sizes.length / 2)]}</span>
      </p>
    </section>
  );
}
