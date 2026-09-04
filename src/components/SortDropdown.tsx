import { useEffect, useRef, useState } from 'react';
import type { SortId } from '@/types';
import { SORT_OPTIONS } from '@/utils/catalogue';
import { ChevronDown, CheckIcon } from './Icons';
import '@/styles/listing.css';

interface Props {
  value: SortId;
  onChange: (value: SortId) => void;
}

export default function SortDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = SORT_OPTIONS.find((o) => o.id === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="sort" ref={ref}>
      <button
        type="button"
        className="sort__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sort__label">Sort by:</span>
        <span className="sort__value">{active.label}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <ul className="sort__menu" role="listbox" aria-label="Sort products">
          {SORT_OPTIONS.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                role="option"
                aria-selected={opt.id === value}
                className={`sort__opt ${opt.id === value ? 'is-active' : ''}`}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                {opt.label}
                {opt.id === value && <CheckIcon size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
