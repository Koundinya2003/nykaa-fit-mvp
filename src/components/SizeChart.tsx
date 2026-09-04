import { useEffect } from 'react';
import type { Product } from '@/types';
import { getSizeChartFor } from '@/data/sizeCharts';
import { CloseIcon } from './Icons';
import '@/styles/pdp.css';

interface Props {
  product: Product;
  open: boolean;
  onClose: () => void;
  /** Highlights the shopper's currently selected size in the table. */
  selectedSize: string | null;
}

export default function SizeChart({ product, open, onClose, selectedSize }: Props) {
  const chart = getSizeChartFor(product);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={chart.title}>
      <div className="modal__scrim" onClick={onClose} />
      <div className="modal__panel">
        <header className="modal__head">
          <div>
            <p className="eyebrow">Size Guide</p>
            <h2 className="modal__title">{chart.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close size guide">
            <CloseIcon />
          </button>
        </header>

        <div className="modal__body">
          <div className="chart-wrap">
            <table className="chart">
              <thead>
                <tr>
                  <th scope="col">Size</th>
                  {chart.columns.map((c) => (
                    <th key={c} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.rows.map((row) => (
                  <tr key={row.size} className={row.size === selectedSize ? 'is-selected' : ''}>
                    <th scope="row">{row.size}</th>
                    {row.values.map((v, i) => (
                      <td key={chart.columns[i]}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="chart-note">
            <p className="chart-note__title">How to measure</p>
            <p>{chart.note}</p>
          </div>

          <div className="chart-fit">
            <span className="eyebrow">This style</span>
            <p>
              <strong>{product.fit}</strong> · {product.material}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
