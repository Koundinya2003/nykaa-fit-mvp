import { useState } from 'react';
import type { Product } from '@/types';
import { ChevronDown } from './Icons';
import '@/styles/pdp.css';

interface Props {
  product: Product;
}

type PanelId = 'description' | 'details' | 'material' | 'returns';

const PANELS: { id: PanelId; title: string }[] = [
  { id: 'description', title: 'Product Description' },
  { id: 'details', title: 'Product Details' },
  { id: 'material', title: 'Material & Care' },
  { id: 'returns', title: 'Returns & Exchange' },
];

export default function ProductInfo({ product }: Props) {
  const [open, setOpen] = useState<PanelId[]>(['description', 'details']);
  const toggle = (id: PanelId) =>
    setOpen((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const care = product.details.find((d) => d.startsWith('Wash Care:'))?.split(': ')[1] ?? '';

  return (
    <div className="info">
      {PANELS.map((panel) => {
        const isOpen = open.includes(panel.id);
        return (
          <section key={panel.id} className={`info__panel ${isOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="info__head"
              aria-expanded={isOpen}
              onClick={() => toggle(panel.id)}
            >
              <span>{panel.title}</span>
              <ChevronDown size={18} className="info__chev" />
            </button>

            {isOpen && (
              <div className="info__body">
                {panel.id === 'description' && <p className="info__text">{product.description}</p>}

                {panel.id === 'details' && (
                  <dl className="spec">
                    {product.details.map((line) => {
                      const [label, ...rest] = line.split(': ');
                      return (
                        <div key={line} className="spec__row">
                          <dt>{label}</dt>
                          <dd>{rest.join(': ')}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}

                {panel.id === 'material' && (
                  <div className="info__text">
                    <p>
                      <strong>{product.material}</strong>
                    </p>
                    <p className="info__muted">
                      {care}. Wash dark colours separately for the first few washes. Dry in shade to
                      protect the finish.
                    </p>
                  </div>
                )}

                {panel.id === 'returns' && (
                  <ul className="info__list">
                    <li>14-day return and exchange window from the date of delivery.</li>
                    <li>Free reverse pickup — the item must be unused with tags intact.</li>
                    <li>Refunds are issued to the original payment method within 5–7 working days.</li>
                    <li>Exchange for a different size is subject to availability.</li>
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
