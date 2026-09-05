import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { seedDemo, track, DEMO_ITEM_COUNT, DEMO_BRAND_COUNT } from '@/features/nykaa-fit';
import { setTourVisible } from '@/utils/tourState';
import { RulerIcon } from '@/components/Icons';
import '@/styles/demo.css';

/* =========================================================================
   /demo — one click to the finished state.

   Seeds a measured fit profile and a ten-item wishlist that has been
   accumulating across the 30-day window, then hands off to the wishlist with
   ?resolve=1 so the recommender runs a real pass on arrival.

   Everything the evaluator then sees is computed, not staged.
   ========================================================================= */

export default function DemoPage() {
  const { setWishlistEntries } = useShop();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    // StrictMode double-invokes effects in development; seeding twice would
    // double the wishlist_item_saved counts on /metrics.
    if (seeded.current) return;
    seeded.current = true;

    try {
      const { wishlist } = seedDemo();
      setWishlistEntries(wishlist);
      setTourVisible(true);
      track('fit_cta_clicked', { reason: 'demo_walkthrough', item_count: wishlist.length });
      navigate('/wishlist?resolve=1', { replace: true });
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). Say so
      // rather than leaving a blank screen.
      setError(
        'This browser is blocking local storage, so the walkthrough cannot save a profile. Try a normal (non-private) window.',
      );
    }
  }, [navigate, setWishlistEntries]);

  return (
    <div className="page demo">
      <div className="demo__card">
        <p className="demo__eyebrow">
          <RulerIcon size={16} /> Nykaa Fit
        </p>
        <h1 className="display demo__title">
          {error ? 'Walkthrough unavailable' : 'Setting up your walkthrough'}
        </h1>
        <p className="demo__body">
          {error ??
            `Saving a measured fit profile and ${DEMO_ITEM_COUNT} wishlisted items across ${DEMO_BRAND_COUNT} brands, then resolving every one of them.`}
        </p>
      </div>
    </div>
  );
}
