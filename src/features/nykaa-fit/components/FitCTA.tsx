import { RulerIcon } from '@/components/Icons';
import '../styles/nykaa-fit.css';

interface Props {
  onClick: () => void;
}

/**
 * Entry point, sitting immediately under the size selector — the moment the
 * uncertainty actually bites.
 *
 * The promise is deliberately modest: a recommendation for *this* product,
 * not a perfect or guaranteed size. The selector above works untouched for
 * anyone who ignores this.
 */
export default function FitCTA({ onClick }: Props) {
  return (
    <div className="fit-cta">
      <p className="fit-cta__prompt">Not sure which size to choose?</p>
      <button type="button" className="fit-cta__btn" onClick={onClick}>
        <RulerIcon size={17} />
        Find My Fit
      </button>
      <p className="fit-cta__sub">
        Get a personalised size recommendation based on your profile and this product&rsquo;s fit
      </p>
    </div>
  );
}
