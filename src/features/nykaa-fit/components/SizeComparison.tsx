import type { FitRecommendation } from '../types/fitTypes';
import '../styles/nykaa-fit.css';

interface Props {
  recommendation: FitRecommendation;
}

const ROWS: { key: 'bust' | 'waist' | 'hip'; label: string }[] = [
  { key: 'bust', label: 'Bust' },
  { key: 'waist', label: 'Waist' },
  { key: 'hip', label: 'Hip' },
];

/** Side-by-side view of how each size lands, so the shopper can see what
 *  sizing up or down would actually change rather than guessing. */
export default function SizeComparison({ recommendation }: Props) {
  const { assessments, recommendedSize } = recommendation;

  // Show the recommendation plus a neighbour either side — the sizes anyone
  // is realistically weighing up.
  const index = assessments.findIndex((a) => a.size === recommendedSize);
  const start = Math.max(0, Math.min(index - 1, assessments.length - 3));
  const shown = assessments.slice(start, start + 3);

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
                <th
                  key={a.size}
                  scope="col"
                  className={a.size === recommendedSize ? 'is-recommended' : ''}
                >
                  <span className="fit-compare__size">{a.size}</span>
                  {a.size === recommendedSize && (
                    <span className="fit-compare__flag">Recommended</span>
                  )}
                  {!a.available && <span className="fit-compare__oos">Sold out</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Overall</th>
              {shown.map((a) => (
                <td key={a.size} className={a.size === recommendedSize ? 'is-recommended' : ''}>
                  <strong>{a.character}</strong>
                </td>
              ))}
            </tr>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {shown.map((a) => (
                  <td key={a.size} className={a.size === recommendedSize ? 'is-recommended' : ''}>
                    {a.verdicts[row.key]}
                    <span className="fit-compare__ease">
                      {a.ease[row.key] > 0 ? '+' : ''}
                      {a.ease[row.key].toFixed(1)}″
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fit-compare__note">
        Figures show the room each size leaves versus your estimated measurements, after allowing
        for this style&rsquo;s cut and the brand&rsquo;s sizing.
      </p>
    </div>
  );
}
