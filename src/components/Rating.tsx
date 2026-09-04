import { StarIcon } from './Icons';
import { formatCount } from '@/utils/format';
import '@/styles/product.css';

interface Props {
  value: number;
  count?: number;
  /** `chip` is the compact badge used on product cards. */
  variant?: 'chip' | 'stars';
  size?: number;
}

export default function Rating({ value, count, variant = 'chip', size = 13 }: Props) {
  if (variant === 'chip') {
    return (
      <span className="rating-chip" aria-label={`Rated ${value} out of 5`}>
        <span className="rating-chip__value">{value.toFixed(1)}</span>
        <StarIcon size={size - 2} />
        {typeof count === 'number' && (
          <span className="rating-chip__count">{formatCount(count)}</span>
        )}
      </span>
    );
  }

  return (
    <span className="rating-stars" aria-label={`Rated ${value} out of 5`}>
      <span className="rating-stars__row" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon key={i} size={size} filled={false} className="rating-stars__bg" />
        ))}
        <span className="rating-stars__fill" style={{ width: `${(value / 5) * 100}%` }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <StarIcon key={i} size={size} />
          ))}
        </span>
      </span>
      {typeof count === 'number' && (
        <span className="rating-stars__count">{formatCount(count)} reviews</span>
      )}
    </span>
  );
}
