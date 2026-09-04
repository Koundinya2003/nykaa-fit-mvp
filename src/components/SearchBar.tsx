import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCTS } from '@/data/products';
import { suggest } from '@/utils/catalogue';
import { SearchIcon, CloseIcon } from './Icons';
import '@/styles/layout.css';

const POPULAR = ['dress', 'jeans', 'shirt', 'sneakers', 'kurta', 'polo'];

interface Props {
  initialValue?: string;
  onNavigate?: () => void;
}

export default function SearchBar({ initialValue = '', onNavigate }: Props) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => setValue(initialValue), [initialValue]);

  const suggestions = useMemo(() => suggest(PRODUCTS, value), [value]);
  const showPopular = value.trim().length < 2;
  const items = showPopular
    ? POPULAR.map((p) => ({ label: p, to: `/search?q=${encodeURIComponent(p)}`, kind: 'popular' as const }))
    : suggestions;

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const go = (to: string) => {
    setOpen(false);
    setCursor(-1);
    onNavigate?.();
    navigate(to);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    go(`/search?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (c + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (c - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault();
      go(items[cursor].to);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="search" ref={wrapRef}>
      <form className="search__form" role="search" onSubmit={submit}>
        <SearchIcon size={18} className="search__icon" />
        <input
          type="search"
          className="search__input"
          placeholder="Search for brands, dresses, jeans…"
          aria-label="Search products"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setCursor(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            className="search__clear"
            aria-label="Clear search"
            onClick={() => {
              setValue('');
              setOpen(true);
            }}
          >
            <CloseIcon size={16} />
          </button>
        )}
      </form>

      {open && items.length > 0 && (
        <div className="search__panel" role="listbox">
          {showPopular && <p className="search__panel-title">Popular searches</p>}
          {items.map((item, i) => (
            <button
              key={`${item.kind}-${item.label}`}
              type="button"
              role="option"
              aria-selected={cursor === i}
              className={`search__opt ${cursor === i ? 'is-cursor' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(item.to)}
            >
              <SearchIcon size={15} className="search__opt-icon" />
              <span className="search__opt-label">{item.label}</span>
              {item.kind !== 'popular' && <span className="search__opt-kind">{item.kind}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
