import type { PriceSummary } from '@/types';
import { formatINR } from '@/utils/format';
import '@/styles/bag.css';

interface Props {
  summary: PriceSummary;
  children?: React.ReactNode;
}

export default function PriceSummaryCard({ summary, children }: Props) {
  const toFreeDelivery = summary.freeDeliveryThreshold - summary.sellingTotal;
  const progress = Math.min(100, (summary.sellingTotal / summary.freeDeliveryThreshold) * 100);

  return (
    <aside className="summary" aria-label="Price details">
      <h2 className="summary__title">
        Price Details ({summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'})
      </h2>

      <dl className="summary__rows">
        <div>
          <dt>Total MRP</dt>
          <dd>{formatINR(summary.mrpTotal)}</dd>
        </div>
        <div>
          <dt>Discount on MRP</dt>
          <dd className="summary__discount">−{formatINR(summary.discountTotal)}</dd>
        </div>
        <div>
          <dt>Delivery charge</dt>
          <dd className={summary.deliveryFee === 0 ? 'summary__free' : undefined}>
            {summary.deliveryFee === 0 ? 'FREE' : formatINR(summary.deliveryFee)}
          </dd>
        </div>
      </dl>

      {summary.sellingTotal > 0 && toFreeDelivery > 0 && (
        <div className="summary__nudge">
          <p>
            Add <strong>{formatINR(toFreeDelivery)}</strong> more for free delivery
          </p>
          <span className="summary__bar">
            <span className="summary__bar-fill" style={{ width: `${progress}%` }} />
          </span>
        </div>
      )}

      <div className="summary__total">
        <span>Total Amount</span>
        <span>{formatINR(summary.payable)}</span>
      </div>

      {summary.discountTotal > 0 && (
        <p className="summary__saving">
          You save {formatINR(summary.discountTotal)} on this order
        </p>
      )}

      {children}
    </aside>
  );
}
