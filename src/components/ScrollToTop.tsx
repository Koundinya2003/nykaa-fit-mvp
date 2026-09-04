import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Route changes should start at the top of the page, except when only the
 *  query string changed (filters, sort) — there the shopper is mid-scroll. */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}
