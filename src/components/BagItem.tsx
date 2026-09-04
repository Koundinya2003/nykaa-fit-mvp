import { Link } from 'react-router-dom';
import type { BagItem as BagLine, Product } from '@/types';
import { useShop } from '@/context/ShopContext';
import { formatINR } from '@/utils/format';
import ProductImageView from './ProductImage';
import QuantityStepper from './QuantityStepper';
import { TrashIcon } from './Icons';
import '@/styles/bag.css';

interface Props {
  line: BagLine;
  product: Product;
}

export default function BagItemRow({ line, product }: Props) {
  const { setQuantity, removeFromBag, changeSize, toggleWishlist, isWishlisted } = useShop();
  const lineTotal = product.price * line.quantity;
  const lineMrp = product.mrp * line.quantity;

  return (
    <article className="bagline">
      <Link to={`/p/${product.id}`} className="bagline__media">
        <ProductImageView product={product} colorName={line.colorName} view="front" />
      </Link>

      <div className="bagline__body">
        <div className="bagline__top">
          <div>
            <p className="bagline__brand">{product.brand}</p>
            <Link to={`/p/${product.id}`} className="bagline__name">
              {product.name}
            </Link>
            <p className="bagline__variant">
              <span className="bagline__swatch" style={{ background: product.colors.find((c) => c.name === line.colorName)?.hex }} />
              {line.colorName}
            </p>
          </div>

          <button
            type="button"
            className="bagline__remove"
            aria-label={`Remove ${product.name} from bag`}
            onClick={() => removeFromBag(line.key)}
          >
            <TrashIcon />
          </button>
        </div>

        <div className="bagline__controls">
          <label className="bagline__size">
            <span className="bagline__size-label">Size</span>
            <select
              value={line.size}
              onChange={(e) => changeSize(line.key, e.target.value)}
              aria-label={`Size for ${product.name}`}
            >
              {product.sizes.map((s) => (
                <option key={s} value={s} disabled={product.soldOutSizes.includes(s)}>
                  {s}
                  {product.soldOutSizes.includes(s) ? ' — sold out' : ''}
                </option>
              ))}
            </select>
          </label>

          <QuantityStepper
            value={line.quantity}
            onChange={(q) => setQuantity(line.key, q)}
            label={`Quantity for ${product.name}`}
          />

          <p className="bagline__price">
            <span className="bagline__price-now">{formatINR(lineTotal)}</span>
            {lineMrp > lineTotal && <span className="bagline__price-mrp">{formatINR(lineMrp)}</span>}
          </p>
        </div>

        <div className="bagline__foot">
          <button
            type="button"
            className="bagline__link"
            onClick={() => {
              if (!isWishlisted(product.id)) toggleWishlist(product);
              removeFromBag(line.key);
            }}
          >
            Move to wishlist
          </button>
          <span className="bagline__eta">Delivery in 3–5 days</span>
        </div>
      </div>
    </article>
  );
}
