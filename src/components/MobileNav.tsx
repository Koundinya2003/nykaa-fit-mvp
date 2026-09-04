import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { CloseIcon } from './Icons';
import '@/styles/layout.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Full-height slide-in nav for small screens. Body scroll is locked while
 *  it is open so the page behind does not move under the drawer. */
export default function MobileNav({ open, onClose }: Props) {
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

  return (
    <>
      <div className={`drawer-scrim ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden />
      <aside
        className={`mobile-nav ${open ? 'is-open' : ''}`}
        aria-label="Categories"
        aria-hidden={!open}
      >
        <div className="mobile-nav__head">
          <span className="mobile-nav__brand">Nykaa Fashion</span>
          <button type="button" onClick={onClose} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>

        <div className="mobile-nav__body">
          {CATEGORIES.map((cat) => (
            <section key={cat.id} className="mobile-nav__section">
              <Link to={`/c/${cat.id}`} className="mobile-nav__head-link" onClick={onClose}>
                {cat.label}
              </Link>
              <ul>
                {cat.navGroups.flatMap((g) => g.links).slice(0, 5).map((link) => (
                  <li key={link.label + link.to}>
                    <Link to={link.to} className="mobile-nav__link" onClick={onClose}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="mobile-nav__section">
            <Link to="/wishlist" className="mobile-nav__head-link" onClick={onClose}>
              Wishlist
            </Link>
            <Link to="/bag" className="mobile-nav__head-link" onClick={onClose}>
              Shopping Bag
            </Link>
          </section>
        </div>
      </aside>
    </>
  );
}
