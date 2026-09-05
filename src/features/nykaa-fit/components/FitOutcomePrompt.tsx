import { useMemo, useState } from 'react';
import type { BagItem } from '@/types';
import { getProductById } from '@/data/products';
import {
  recordOutcome,
  RETURN_REASON_LABEL,
  type FitOutcome,
  type ReturnReason,
} from '../utils/fitOutcomes';
import { useFitOutcomes } from '../utils/useFitOutcomes';
import { personalNotesFor } from '../utils/personalFitNotes';
import { track } from '../analytics/fitAnalytics';
import { CheckIcon } from '@/components/Icons';
import '../styles/nykaa-fit.css';

/* =========================================================================
   Did it fit?

   Everything upstream of this is a prediction. This is the only place the
   prototype finds out whether the prediction was right, and it is the only
   fit signal the shopper cannot get from a size chart.

   What it deliberately does NOT do is move the recommended size. One or
   two returns is a real signal to a person and a hopeless statistic, and
   quietly shifting a number computed from a published chart on that basis
   would be exactly the kind of invisible fudge this feature exists without.
   Her reports come back to her as advice on that brand — see
   `personalFitNotes` — where her judgement can do the work ours cannot.
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

  /** Outcomes reported against this order, keyed by line. */
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

    setPendingReturn(null);
  };

  if (rows.length === 0) return null;

  return (
    <section className="fit-outcome" aria-labelledby="fit-outcome-title">
      <h2 id="fit-outcome-title" className="fit-outcome__title">
        Did it fit?
      </h2>
      <p className="fit-outcome__lede">
        The one thing a size chart can&rsquo;t tell us. Your answer is kept on this device and
        shown back to you next time you look at this brand — we won&rsquo;t silently change a size
        on the strength of one return, but you might want to.
      </p>

      <ul className="fit-outcome__list">
        {rows.map(({ line, product }) => {
          const key = `${product.id}::${line.size}`;
          const record = reported.get(key);
          const notes = personalNotesFor(product.brand, outcomes);

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
                  {notes.length > 0 && (
                    <p className="fit-outcome__effect">{notes[0].label}. You&rsquo;ll see this
                      next time you open a {product.brand} product.</p>
                  )}
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
                  <button type="button" className="fit-link" onClick={() => setPendingReturn(null)}>
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
    </section>
  );
}
