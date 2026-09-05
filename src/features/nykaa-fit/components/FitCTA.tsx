import { RulerIcon } from '@/components/Icons';
import '../styles/nykaa-fit.css';

interface Props {
  onClick: () => void;
  /** True when a profile exists but carries no measurements yet. */
  needsMeasurements?: boolean;
  onOpenSizeChart: () => void;
}

/**
 * Entry point, sitting immediately under the size selector — the moment the
 * uncertainty actually bites.
 *
 * The promise is deliberately modest and specific: three measurements, once,
 * reused on every brand. The selector above works untouched for anyone who
 * ignores this, and the size chart is offered in the same breath so a
 * shopper without a tape measure is not left at a dead end.
 */
export default function FitCTA({ onClick, needsMeasurements, onOpenSizeChart }: Props) {
  return (
    <div className="fit-cta">
      <p className="fit-cta__prompt">
        {needsMeasurements
          ? 'Your profile has no measurements yet'
          : 'Not sure which size to choose?'}
      </p>
      <button type="button" className="fit-cta__btn" onClick={onClick}>
        <RulerIcon size={17} />
        {needsMeasurements ? 'Add my measurements' : 'Find my fit'}
      </button>
      <p className="fit-cta__sub">
        Enter your bust, waist and hip once. We compare them against this brand&rsquo;s own size
        chart — and every other brand you save.
      </p>
      <button type="button" className="fit-link fit-cta__chart" onClick={onOpenSizeChart}>
        Or just show me the size chart
      </button>
    </div>
  );
}
