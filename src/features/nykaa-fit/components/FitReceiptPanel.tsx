import type { FitRecommendation } from '../types/fitTypes';
import { MEASUREMENT_LABEL } from '../types/fitTypes';
import '../styles/nykaa-fit.css';

interface Props {
  recommendation: FitRecommendation;
  brand: string;
}

/**
 * The receipt: everything that went into the answer, and what was kept out.
 *
 * Built from the same object the engine returned, so this panel cannot
 * describe a computation that did not happen. The "not used" list is the
 * important half — a shopper being told a size for her own body is owed a
 * straight answer about what the store consulted to get there.
 */
export default function FitReceiptPanel({ recommendation, brand }: Props) {
  const { receipt, assessments, recommendedSize, easeTarget, confidence } = recommendation;
  const chosen = assessments.find((a) => a.size === recommendedSize);

  return (
    <div className="receipt">
      <section className="receipt__block">
        <h4 className="receipt__title">What you told us</h4>
        <dl className="receipt__rows">
          {receipt.inputsUsed.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
          {receipt.inputsMissing.map((row) => (
            <div key={row.label} className="is-missing">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="receipt__block">
        <h4 className="receipt__title">What this product publishes</h4>
        <dl className="receipt__rows">
          {receipt.productFacts.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="receipt__block">
        <h4 className="receipt__title">The room we looked for</h4>
        {receipt.easeTarget.parts.length === 0 ? (
          <p className="receipt__note">
            A regular cut and a regular preference, so we looked for the size cut closest to your
            measurements exactly — no adjustment either way.
          </p>
        ) : (
          <ul className="receipt__ease">
            {receipt.easeTarget.parts.map((part) => (
              <li key={part.label}>
                <span>{part.label}</span>
                <span className={`receipt__inches is-${part.inches > 0 ? 'up' : 'down'}`}>
                  {part.inches > 0 ? '+' : ''}
                  {part.inches.toFixed(2)}″
                </span>
              </li>
            ))}
            <li className="is-total">
              <span>Total room we looked for</span>
              <span className="receipt__inches">
                {easeTarget > 0 ? '+' : ''}
                {easeTarget.toFixed(2)}″
              </span>
            </li>
          </ul>
        )}
      </section>

      {chosen && !confidence.withheld && (
        <section className="receipt__block">
          <h4 className="receipt__title">
            How {recommendedSize} compares, measurement by measurement
          </h4>
          <div className="receipt__scroll">
            <table className="receipt__table">
              <thead>
                <tr>
                  <th scope="col">Measurement</th>
                  <th scope="col">Yours</th>
                  <th scope="col">{brand} {recommendedSize}</th>
                  <th scope="col">Room left</th>
                </tr>
              </thead>
              <tbody>
                {chosen.comparisons.map((c) => (
                  <tr key={c.key} className={c.yours === null ? 'is-skipped' : ''}>
                    <th scope="row">{MEASUREMENT_LABEL[c.key]}</th>
                    <td>{c.yours === null ? '—' : `${c.yours}″`}</td>
                    <td>{c.chart}″</td>
                    <td>
                      {c.ease === null ? (
                        <span className="receipt__skip">not compared</span>
                      ) : (
                        <>
                          <strong>
                            {c.ease > 0 ? '+' : ''}
                            {c.ease.toFixed(1)}″
                          </strong>{' '}
                          <span className="receipt__verdict">{c.verdict}</span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="receipt__note">
            &ldquo;Room left&rdquo; is what this size leaves you after the room you asked for.
            Around zero is the target; negative means tighter than you wanted.
          </p>
        </section>
      )}

      <section className="receipt__block receipt__block--excluded">
        <h4 className="receipt__title">What we did not use</h4>
        <ul className="receipt__excluded">
          {receipt.notUsed.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="receipt__note">
          The size above comes from your measurements and {brand}&rsquo;s published chart. Nothing
          else fed into it.
        </p>
      </section>
    </div>
  );
}
