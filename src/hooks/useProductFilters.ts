import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FilterState, SortId, SubcategoryId } from '@/types';
import { EMPTY_FILTERS, SORT_OPTIONS } from '@/utils/catalogue';

/**
 * Filter and sort state lives in the URL rather than in component state. That
 * makes every filtered view shareable, keeps the browser back button working
 * through a filtering session, and survives a reload for free.
 */

const LIST_KEYS = ['brand', 'size', 'color', 'sub'] as const;

function readList(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  return raw ? raw.split(',').filter(Boolean) : [];
}

function readNumber(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export interface FilterControls {
  filters: FilterState;
  sort: SortId;
  gender: 'women' | 'men' | null;
  tag: string | null;
  setSort: (sort: SortId) => void;
  toggleList: (key: (typeof LIST_KEYS)[number], value: string) => void;
  setPriceBand: (min: number | null, max: number | null) => void;
  setMinDiscount: (value: number | null) => void;
  setMinRating: (value: number | null) => void;
  clearAll: () => void;
  clearOne: (key: keyof FilterState, value?: string) => void;
}

export function useProductFilters(): FilterControls {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<FilterState>(
    () => ({
      brands: readList(params, 'brand'),
      sizes: readList(params, 'size'),
      colors: readList(params, 'color'),
      subcategories: readList(params, 'sub') as SubcategoryId[],
      priceMin: readNumber(params, 'pmin'),
      priceMax: readNumber(params, 'pmax'),
      minDiscount: readNumber(params, 'disc'),
      minRating: readNumber(params, 'rating'),
    }),
    [params],
  );

  const sortParam = params.get('sort') as SortId | null;
  const sort: SortId =
    sortParam && SORT_OPTIONS.some((o) => o.id === sortParam) ? sortParam : 'recommended';

  const genderParam = params.get('gender');
  const gender = genderParam === 'women' || genderParam === 'men' ? genderParam : null;

  /** Mutating helper — always replaces history entries for filter tweaks so
   *  "back" returns to the previous page rather than the previous checkbox. */
  const update = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params);
      mutate(next);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const toggleList = useCallback(
    (key: (typeof LIST_KEYS)[number], value: string) => {
      update((next) => {
        const current = readList(next, key);
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (updated.length) next.set(key, updated.join(','));
        else next.delete(key);
      });
    },
    [update],
  );

  const setPriceBand = useCallback(
    (min: number | null, max: number | null) => {
      update((next) => {
        if (min === null) next.delete('pmin');
        else next.set('pmin', String(min));
        if (max === null) next.delete('pmax');
        else next.set('pmax', String(max));
      });
    },
    [update],
  );

  const setNumeric = useCallback(
    (key: 'disc' | 'rating', value: number | null) => {
      update((next) => {
        if (value === null) next.delete(key);
        else next.set(key, String(value));
      });
    },
    [update],
  );

  const setSort = useCallback(
    (value: SortId) => {
      update((next) => {
        if (value === 'recommended') next.delete('sort');
        else next.set('sort', value);
      });
    },
    [update],
  );

  const clearAll = useCallback(() => {
    update((next) => {
      ['brand', 'size', 'color', 'sub', 'pmin', 'pmax', 'disc', 'rating'].forEach((k) =>
        next.delete(k),
      );
    });
  }, [update]);

  const clearOne = useCallback(
    (key: keyof FilterState, value?: string) => {
      switch (key) {
        case 'brands':
          return toggleList('brand', value!);
        case 'sizes':
          return toggleList('size', value!);
        case 'colors':
          return toggleList('color', value!);
        case 'subcategories':
          return toggleList('sub', value!);
        case 'priceMin':
        case 'priceMax':
          return setPriceBand(null, null);
        case 'minDiscount':
          return setNumeric('disc', null);
        case 'minRating':
          return setNumeric('rating', null);
        default:
          return undefined;
      }
    },
    [toggleList, setPriceBand, setNumeric],
  );

  return {
    filters: { ...EMPTY_FILTERS, ...filters },
    sort,
    gender,
    tag: params.get('tag'),
    setSort,
    toggleList,
    setPriceBand,
    setMinDiscount: (v) => setNumeric('disc', v),
    setMinRating: (v) => setNumeric('rating', v),
    clearAll,
    clearOne,
  };
}
