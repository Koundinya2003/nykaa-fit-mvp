import { Link } from 'react-router-dom';
import ProductImageView from '@/components/ProductImage';
import WishlistButton from '@/components/WishlistButton';
import { formatINR } from '@/utils/format';
import ConfidenceChip from './ConfidenceChip';
import {
  reasonLabel,
  savedAgoLabel,
  WISHLIST_WINDOW_DAYS,
  type ResolvedWishlistItem,
} from '../utils/wishlistFit';
import '@/styles/wishlist.css';

interface Props {
  item: ResolvedWishlistItem;
  /** Null before the shopper has run a pass over the list. */
  resolved: boolean;
  onAddToBag: (item: ResolvedWishlistItem) => void;
}

/**
 * One saved item, answered.
 *
 * Three facts, in the order the shopper needs them: what size, how sure we
 * are, and whether that size can actually be bought today. The fourth — how
 * long it has been sitting there — is what makes the 30-day window visible
 * rather than a number on a slide.
 */
export default function WishlistFitCard({ item, resolved, onAddToBag }: Props) {
  const { product, size, inStock, recommendation, daysSaved, daysLeftInWindow } = item;
  // These two states are fixed by going to the profile, not by opening the
  // product — sending her to the PDP would be a dead end.
  const needsProfile =
    item.reason.kind === 'no-profile' || item.reason.kind === 'no-measurements';
  const urgent = daysLeftInWindow <= 7 && daysLeftInWindow >= 0;
  const lapsed = daysLeftInWindow < 0;

  return (
    <article className={`wl-card wl-card--${item.group}`}>
      <Link to={`/p/${product.id}`} className="wl-card__thumb" aria-label={product.name}>
        <ProductImageView product={product} colorName={product.colors[0].name} view="front" />
      </Link>

      <div className="wl-card__body">
        <div className="wl-card__headline">
          <div className="wl-card__ident">
            <p className="wl-card__brand">{product.brand}</p>
            <Link to={`/p/${product.id}`} className="wl-card__name">
              {product.name}
            </Link>
            <p className="wl-card__price">
              {formatINR(product.price)}
              <span className="wl-card__mrp">{formatINR(product.mrp)}</span>
              <span className="wl-card__off">{product.discount}% off</span>
            </p>
          </div>
          <WishlistButton product={product} variant="icon" />
        </div>

        {/* ---- The fit answer ---- */}
        <div className="wl-card__fit">
          {resolved && size ? (
            <>
              <span className="wl-card__size" aria-label={`Recommended size ${size}`}>
                {size}
              </span>
              <div className="wl-card__fitcopy">
                <p className="wl-card__fitlabel">Your size in this style</p>
                {recommendation && <ConfidenceChip confidence={recommendation.confidence} />}
              </div>
            </>
          ) : (
            <>
              <span className="wl-card__size wl-card__size--none" aria-hidden>
                {resolved ? '—' : '?'}
              </span>
              <div className="wl-card__fitcopy">
                <p className="wl-card__fitlabel">
                  {needsProfile
                    ? 'Waiting on your measurements'
                    : resolved
                      ? 'No size recommendation'
                      : 'Not resolved yet'}
                </p>
                {resolved && recommendation && (
                  <ConfidenceChip confidence={recommendation.confidence} />
                )}
              </div>
            </>
          )}
        </div>

        <p className={`wl-card__stock ${inStock && size ? 'is-in' : 'is-out'}`}>
          {resolved || needsProfile
            ? reasonLabel(item.reason)
            : 'Run a fit pass to see your size and stock'}
        </p>

        <div className="wl-card__foot">
          <p className={`wl-card__saved ${urgent ? 'is-urgent' : ''} ${lapsed ? 'is-lapsed' : ''}`}>
            {savedAgoLabel(daysSaved)}
            {lapsed
              ? ` · past the ${WISHLIST_WINDOW_DAYS}-day window`
              : urgent
                ? ` · ${daysLeftInWindow} ${daysLeftInWindow === 1 ? 'day' : 'days'} left in the ${WISHLIST_WINDOW_DAYS}-day window`
                : ''}
          </p>

          {resolved && size && inStock ? (
            <button
              type="button"
              className="btn btn--accent btn--sm wl-card__cta"
              onClick={() => onAddToBag(item)}
            >
              Add {size} to bag
            </button>
          ) : needsProfile ? (
            <Link to="/fit-profile" className="btn btn--accent btn--sm wl-card__cta">
              Add measurements
            </Link>
          ) : (
            <Link to={`/p/${product.id}`} className="btn btn--ghost btn--sm wl-card__cta">
              {resolved && !size ? 'Open size chart' : 'View product'}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
