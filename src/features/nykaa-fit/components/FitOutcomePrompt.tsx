import { useMemo, useState } from 'react';
import type { BagItem } from '@/types';
import { getProductById } from '@/data/products';
import { brandFitHistory } from '../engine/brandFitHistory';
import {
  recordOutcome,
  RETURN_REASON_LABEL,
  type FitOutcome,
  type ReturnReason,
} from '../utils/fitOutcomes';
import { useFitOutcomes } from '../utils/useFitOutcomes';
import { track } from '../analytics/fitAnalytics';
import { CheckIcon } from '@/components/Icons';
import '../styles/nykaa-fit.css';

/* =========================================================================
   Did it fit?

   Everything upstream of this is a prediction. This is the only place the
   prototype finds out whether the prediction was right, and it is the
   signal that turns a static heuristic into something that improves: the
   answer goes straight into that brand's fit history, where it outweighs
   six review opinions, and the next recommendation on that brand moves.

   The shift is shown, not asserted — the panel prints the inches the brand's
   applied ease moved as a result of what was just reported.
   ========================================================================= */

interface Props {
  orderId: string;
  lines: BagItem[];
  /** What Nykaa Fit had recommended per product, where it had a view. */
  recommendedByProduct: Record<string, string | null>;
}

const RETURN_REASONS: ReturnReason[] = ['too-small', 'too-large', 'style', 'quality'];

export default function FitOutcomePrompt({ orderId, lines, recommendedByProduct }: Props) {
  const outcomes = useFitOutcomes();
  const [pendingReturn, setPendingReturn] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      lines
        .map((line) => ({ line, product: getProductById(line.productId) }))
        .filter((r): r is { line: BagItem; product: NonNullable<typeof r.product> } =>
          Boolean(r.product),
        ),
    [lines],
  );

  /** Outcomes reported against this order, keyed by bag line. */
  const reported = useMemo(() => {
    const map = new Map<string, (typeof outcomes)[number]>();
    outcomes
      .filter((o) => o.orderId === orderId)
      .forEach((o) => map.set(`${o.productId}::${o.size}`, o));
    return map;
  }, [outcomes, orderId]);

  const submit = (
    productId: string,
    brand: string,
    size: string,
    outcome: FitOutcome,
    reason?: ReturnReason,
  ) => {
    recordOutcome({
      orderId,
      productId,
      brand,
      size,
      outcome,
      reason,
      recommendedSize: recommendedByProduct[productId] ?? null,
    });
    track('fit_outcome_reported', {
      order_id: orderId,
      product_id: productId,
      brand,
      selected_size: size,
      recommended_size: recommendedByProduct[productId] ?? null,
      outcome,
      reason,
    });

    // The effect on the brand is not asserted here — the row re-renders off
    // the live store below and prints the shift the report actually caused.
    setPendingReturn(null);
  };

  if (rows.length === 0) return null;

  return (
    <section className="fit-outcome" aria-labelledby="fit-outcome-title">
      <h2 id="fit-outcome-title" className="fit-outcome__title">
        Did it fit?
      </h2>
      <p className="fit-outcome__lede">
        This is the only question that tells us whether the recommendation was right. Your answer
        goes into that brand&rsquo;s fit history on this device and changes the next size we give
        you for it — a reported return counts for six review opinions, because it is an outcome
        rather than a comment.
      </p>

      <ul className="fit-outcome__list">
        {rows.map(({ line, product }) => {
          const key = `${product.id}::${line.size}`;
          const record = reported.get(key);
          const history = brandFitHistory(product.brand, product.brandSizing);

          return (
            <li key={line.key} className="fit-outcome__row">
              <div className="fit-outcome__ident">
                <p className="fit-outcome__brand">{product.brand}</p>
                <p className="fit-outcome__name">{product.name}</p>
                <p className="fit-outcome__meta">
                  Size {line.size}
                  {recommendedByProduct[product.id] &&
                    ` · we recommended ${recommendedByProduct[product.id]}`}
                </p>
              </div>

              {record ? (
                <div className="fit-outcome__done">
                  <p className="fit-outcome__done-label">
                    <CheckIcon size={14} />
                    {record.outcome === 'kept'
                      ? 'Kept'
                      : `Returned — ${RETURN_REASON_LABEL[record.reason!]}`}
                  </p>
                  <p className="fit-outcome__effect">
                    {product.brand} now reads <strong>{history.label}</strong> ·{' '}
                    {history.appliedEase >= 0 ? '+' : ''}
                    {history.appliedEase.toFixed(2)}″ applied
                    {history.shiftedByOutcomes && (
                      <>
                        {' '}
                        <span className="fit-outcome__shift">
                          ({history.outcomeShift > 0 ? '+' : ''}
                          {history.outcomeShift.toFixed(2)}″ from your reports)
                        </span>
                      </>
                    )}
                  </p>
                </div>
              ) : pendingReturn === key ? (
                <div className="fit-outcome__reasons">
                  <p className="fit-outcome__reasons-label">Why did it come back?</p>
                  <div className="fit-choices">
                    {RETURN_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        className="fit-choice"
                        onClick={() =>
                          submit(product.id, product.brand, line.size, 'returned', reason)
                        }
                      >
                        {RETURN_REASON_LABEL[reason]}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="fit-link"
                    onClick={() => setPendingReturn(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="fit-outcome__actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => submit(product.id, product.brand, line.size, 'kept')}
                  >
                    I kept it
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setPendingReturn(key)}
                  >
                    I returned it
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="fit-outcome__note">
        Reported outcomes stay on this device. See the effect on every brand at{' '}
        <a href="/metrics">/metrics</a>.
      </p>
    </section>
  );
}
