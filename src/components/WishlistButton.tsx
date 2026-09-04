import type { Product } from '@/types';
import { useShop } from '@/context/ShopContext';
import { HeartIcon } from './Icons';
import '@/styles/product.css';

interface Props {
  product: Product;
  variant?: 'floating' | 'inline';
  className?: string;
}

export default function WishlistButton({ product, variant = 'floating', className = '' }: Props) {
  const { isWishlisted, toggleWishlist } = useShop();
  const active = isWishlisted(product.id);

  return (
    <button
      type="button"
      className={`wish wish--${variant} ${active ? 'is-active' : ''} ${className}`}
      aria-pressed={active}
      aria-label={active ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(product);
      }}
    >
      <HeartIcon size={variant === 'inline' ? 20 : 18} filled={active} />
      {variant === 'inline' && <span>{active ? 'Wishlisted' : 'Wishlist'}</span>}
    </button>
  );
}
