import type { FitNote } from '../types/fitTypes';
import '../styles/nykaa-fit.css';

interface Props {
  notes: FitNote[];
}

const SOURCE_LABEL: Record<FitNote['source'], string> = {
  brand: 'From the brand',
  you: 'From your own reports',
};

/**
 * Things worth weighing, shown beside the recommendation rather than folded
 * into it.
 *
 * A brand's "runs small" claim is editorial and a single return of your own
 * is one data point; neither is strong enough to silently move a number
 * computed from a published chart. Putting them here keeps the arithmetic
 * honest and still gets the information in front of the shopper — where she
 * can apply her own judgement, which on one data point is better than ours.
 */
export default function FitNotes({ notes }: Props) {
  if (notes.length === 0) return null;

  return (
    <section className="fit-notes" aria-label="Things to weigh">
      <p className="fit-notes__head">Worth knowing — not applied to the size above</p>
      <ul className="fit-notes__list">
        {notes.map((note) => (
          <li key={note.id} className={`fit-note fit-note--${note.source}`}>
            <p className="fit-note__source">
              {SOURCE_LABEL[note.source]}
              {note.direction && (
                <span className={`fit-note__dir is-${note.direction}`}>
                  points to sizing {note.direction}
                </span>
              )}
            </p>
            <p className="fit-note__label">{note.label}</p>
            <p className="fit-note__body">{note.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
