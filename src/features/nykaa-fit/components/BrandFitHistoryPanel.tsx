import { allBrandFitHistories } from '../engine/brandFitHistory';
import { useFitOutcomes } from '../utils/useFitOutcomes';
import '../styles/nykaa-fit.css';

/**
 * The evidence behind "your size isn't universal", laid out per brand.
 *
 * Every column is derived, not authored: the ease is what the fit reports
 * imply, the agreement is how much those reports concur, and the confidence
 * column is what the recommender actually uses to decide whether it is
 * willing to name a size on that brand at all.
 */
export default function BrandFitHistoryPanel() {
  // Recompute when an outcome is reported.
  const outcomes = useFitOutcomes();
  void outcomes;
  const histories = allBrandFitHistories();

  return (
    <div className="fit-history">
      <div className="fit-history__scroll">
        <table className="fit-history__table">
          <thead>
            <tr>
              <th scope="col">Brand</th>
              <th scope="col">Reads as</th>
              <th scope="col">Published</th>
              <th scope="col">Applied</th>
              <th scope="col">Agreement</th>
              <th scope="col">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {histories.map((h) => (
              <tr key={h.brand} className={h.shiftedByOutcomes ? 'is-shifted' : ''}>
                <th scope="row">{h.brand}</th>
                <td>{h.label}</td>
                <td className="num">
                  {h.publishedEase >= 0 ? '+' : ''}
                  {h.publishedEase.toFixed(2)}″
                </td>
                <td className="num">
                  <strong>
                    {h.appliedEase >= 0 ? '+' : ''}
                    {h.appliedEase.toFixed(2)}″
                  </strong>
                  {h.shiftedByOutcomes && (
                    <span className="fit-history__shift">
                      {h.outcomeShift > 0 ? '↑' : '↓'}
                      {Math.abs(h.outcomeShift).toFixed(2)}
                    </span>
                  )}
                </td>
                <td className="num">{Math.round(h.consistency * 100)}%</td>
                <td>
                  {h.reviewCount} reviews
                  {h.outcomeCount > 0 && (
                    <>
                      {' '}
                      · <strong>{h.outcomeCount} reported</strong>
                      {h.returnCount > 0 && ` (${h.returnCount} returned)`}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fit-history__note">
        Applied ease is the published label pulled toward what shoppers actually reported, in
        proportion to how much evidence exists. A reported return is weighted six times a review,
        because it is an outcome rather than an opinion — report one and the row moves.
      </p>
    </div>
  );
}
