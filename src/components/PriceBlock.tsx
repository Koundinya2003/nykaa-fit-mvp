import { formatINR } from '@/utils/format';
import '@/styles/product.css';

interface Props {
  price: number;
  mrp: number;
  discount: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function PriceBlock({ price, mrp, discount, size = 'sm' }: Props) {
  return (
    <p className={`price price--${size}`}>
      <span className="price__now">{formatINR(price)}</span>
      {mrp > price && (
        <>
          <span className="price__mrp">{formatINR(mrp)}</span>
          <span className="price__off">{discount}% off</span>
        </>
      )}
    </p>
  );
}
