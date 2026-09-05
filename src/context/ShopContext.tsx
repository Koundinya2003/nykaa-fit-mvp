import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { BagItem, PriceSummary, Product, WishlistEntry } from '@/types';
import { getProductById } from '@/data/products';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { bagKey, summarise } from '@/utils/format';
// Imported from the analytics module directly rather than the feature's
// barrel: the barrel pulls in components that import this context, and the
// resulting cycle can leave `track` undefined at module-init time.
import { track } from '@/features/nykaa-fit/analytics/fitAnalytics';

/* =========================================================================
   One small context holds everything that must survive navigation: the bag,
   the wishlist and transient toasts. Deliberately not Redux — an MVP with
   two persisted collections does not need a reducer framework.
   ========================================================================= */

interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  actionTo?: string;
}

interface ShopValue {
  bag: BagItem[];
  wishlist: WishlistEntry[];
  summary: PriceSummary;
  toasts: Toast[];
  addToBag: (product: Product, size: string, colorName: string, quantity?: number) => void;
  removeFromBag: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  changeSize: (key: string, size: string) => void;
  clearBag: () => void;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (product: Product) => void;
  /** Replaces the whole wishlist. Used by /demo to seed a walkthrough. */
  setWishlistEntries: (entries: WishlistEntry[]) => void;
  dismissToast: (id: number) => void;
}

const ShopContext = createContext<ShopValue | null>(null);

const BAG_KEY = 'nykaafit.bag.v1';
const WISHLIST_KEY = 'nykaafit.wishlist.v1';
const MAX_QTY = 5;

/**
 * The first build stored the wishlist as bare product ids, with no record of
 * when anything was saved. Those entries are kept — losing somebody's saved
 * items to a schema change is not acceptable — and dated to now, which is the
 * only honest thing we can say about them.
 */
function migrateWishlist(raw: unknown): WishlistEntry[] {
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  return raw
    .map((item): WishlistEntry | null => {
      if (typeof item === 'string') return { productId: item, addedAt: now };
      if (
        item &&
        typeof (item as WishlistEntry).productId === 'string' &&
        typeof (item as WishlistEntry).addedAt === 'number'
      ) {
        return item as WishlistEntry;
      }
      return null;
    })
    .filter((e): e is WishlistEntry => e !== null);
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [bag, setBag] = useLocalStorage<BagItem[]>(BAG_KEY, []);
  const [storedWishlist, setWishlist] = useLocalStorage<unknown[]>(WISHLIST_KEY, []);
  const wishlist = useMemo(() => migrateWishlist(storedWishlist), [storedWishlist]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Auto-dismiss. One timer per toast, cleared on unmount.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => window.setTimeout(() => dismissToast(t.id), 3800));
    return () => timers.forEach(window.clearTimeout);
  }, [toasts, dismissToast]);

  const addToBag = useCallback(
    (product: Product, size: string, colorName: string, quantity = 1) => {
      const key = bagKey(product.id, size, colorName);
      setBag((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) =>
            i.key === key ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i,
          );
        }
        return [
          ...prev,
          { key, productId: product.id, size, colorName, quantity, addedAt: Date.now() },
        ];
      });
      pushToast({
        message: `${product.brand} · Size ${size} added to bag`,
        actionLabel: 'View Bag',
        actionTo: '/bag',
      });
    },
    [setBag, pushToast],
  );

  const removeFromBag = useCallback(
    (key: string) => {
      setBag((prev) => prev.filter((i) => i.key !== key));
      pushToast({ message: 'Item removed from bag' });
    },
    [setBag, pushToast],
  );

  const setQuantity = useCallback(
    (key: string, quantity: number) => {
      const next = Math.max(1, Math.min(MAX_QTY, quantity));
      setBag((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: next } : i)));
    },
    [setBag],
  );

  /** Changing the size of a line re-keys it. If the shopper already has that
   *  exact variant in the bag, the two lines merge instead of duplicating. */
  const changeSize = useCallback(
    (key: string, size: string) => {
      setBag((prev) => {
        const line = prev.find((i) => i.key === key);
        if (!line || line.size === size) return prev;

        const nextKey = bagKey(line.productId, size, line.colorName);
        const target = prev.find((i) => i.key === nextKey);

        if (target) {
          return prev
            .filter((i) => i.key !== key)
            .map((i) =>
              i.key === nextKey
                ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + line.quantity) }
                : i,
            );
        }

        return prev.map((i) => (i.key === key ? { ...i, key: nextKey, size } : i));
      });
    },
    [setBag],
  );

  const clearBag = useCallback(() => setBag([]), [setBag]);

  const isWishlisted = useCallback(
    (productId: string) => wishlist.some((e) => e.productId === productId),
    [wishlist],
  );

  const toggleWishlist = useCallback(
    (product: Product) => {
      setWishlist((prev) => {
        const entries = migrateWishlist(prev);
        const has = entries.some((e) => e.productId === product.id);
        pushToast({
          message: has ? 'Removed from wishlist' : `${product.brand} saved to wishlist`,
          actionLabel: has ? undefined : 'View Wishlist',
          actionTo: has ? undefined : '/wishlist',
        });
        // Saving starts the 30-day clock the primary metric is measured over,
        // so it is an event in its own right rather than a UI state change.
        if (!has) {
          track('wishlist_item_saved', {
            product_id: product.id,
            brand: product.brand,
            category: product.subcategory,
            value: product.price,
          });
        }
        return has
          ? entries.filter((e) => e.productId !== product.id)
          : [...entries, { productId: product.id, addedAt: Date.now() }];
      });
    },
    [setWishlist, pushToast],
  );

  const setWishlistEntries = useCallback(
    (entries: WishlistEntry[]) => setWishlist(entries),
    [setWishlist],
  );

  const summary = useMemo(() => summarise(bag, getProductById), [bag]);

  const value = useMemo<ShopValue>(
    () => ({
      bag,
      wishlist,
      summary,
      toasts,
      addToBag,
      removeFromBag,
      setQuantity,
      changeSize,
      clearBag,
      isWishlisted,
      toggleWishlist,
      setWishlistEntries,
      dismissToast,
    }),
    [
      bag,
      wishlist,
      summary,
      toasts,
      addToBag,
      removeFromBag,
      setQuantity,
      changeSize,
      clearBag,
      isWishlisted,
      toggleWishlist,
      setWishlistEntries,
      dismissToast,
    ],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>');
  return ctx;
}
