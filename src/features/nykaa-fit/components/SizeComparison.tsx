import type { FitRecommendation } from '../types/fitTypes';
import { MEASUREMENT_LABEL, MEASUREMENT_KEYS } from '../types/fitTypes';
import '../styles/nykaa-fit.css';

interface Props {
  recommendation: FitRecommendation;
}

/** Side-by-side view of how each size lands, so the shopper can see what
 *  sizing up or down would actually change rather than guessing. */
export default function SizeComparison({ recommendation }: Props) {
  const { assessments, recommendedSize, confidence } = recommendation;

  // Show the recommendation plus a neighbour either side — the sizes anyone
  // is realistically weighing up.
  const index = assessments.findIndex((a) => a.size === recommendedSize);
  const start = Math.max(0, Math.min(index - 1, assessments.length - 3));
  const shown = assessments.slice(start, start + 3);
  const highlight = confidence.withheld ? null : recommendedSize;

  return (
    <div className="fit-compare">
      <div className="fit-compare__scroll">
        <table className="fit-compare__table">
          <caption className="sr-only">
            How sizes {shown.map((s) => s.size).join(', ')} are expected to fit you
          </caption>
          <thead>
            <tr>
              <th scope="col" className="fit-compare__corner">
                <span className="sr-only">Measurement</span>
              </th>
              {shown.map((a) => (
                <th key={a.size} scope="col" className={a.size === highlight ? 'is-recommended' : ''}>
                  <span className="fit-compare__size">{a.size}</span>
                  {a.size === highlight && <span className="fit-compare__flag">Recommended</span>}
                  {!a.available && <span className="fit-compare__oos">Sold out</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Overall</th>
              {shown.map((a) => (
                <td key={a.size} className={a.size === highlight ? 'is-recommended' : ''}>
                  <strong>{a.character}</strong>
                </td>
              ))}
            </tr>
            {MEASUREMENT_KEYS.map((key) => (
              <tr key={key}>
                <th scope="row">{MEASUREMENT_LABEL[key]}</th>
                {shown.map((a) => {
                  const c = a.comparisons.find((x) => x.key === key)!;
                  return (
                    <td key={a.size} className={a.size === highlight ? 'is-recommended' : ''}>
                      {c.ease === null ? (
                        <span className="fit-compare__skip">not measured</span>
                      ) : (
                        <>
                          {c.verdict}
                          <span className="fit-compare__ease">
                            {c.ease > 0 ? '+' : ''}
                            {c.ease.toFixed(1)}″
                          </span>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fit-compare__note">
        Figures show the room each size leaves against the measurements you gave, after the room
        you asked for. Measurements you skipped are not estimated.
      </p>
    </div>
  );
}
