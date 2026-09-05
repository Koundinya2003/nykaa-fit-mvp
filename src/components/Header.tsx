import { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { useFitProfile, hasMeasurements } from '@/features/nykaa-fit';
import { ANNOUNCEMENTS } from '@/data/homeContent';
import Navigation from './Navigation';
import MobileNav from './MobileNav';
import SearchBar from './SearchBar';
import { BagIcon, HeartIcon, MenuIcon, UserIcon, RulerIcon } from './Icons';
import '@/styles/layout.css';

export default function Header() {
  const { summary, wishlist } = useShop();
  const hasFitProfile = hasMeasurements(useFitProfile());
  const [menuOpen, setMenuOpen] = useState(false);
  const [announcement, setAnnouncement] = useState(0);
  const [params] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    const t = window.setInterval(
      () => setAnnouncement((i) => (i + 1) % ANNOUNCEMENTS.length),
      5000,
    );
    return () => window.clearInterval(t);
  }, []);

  const searchValue = location.pathname === '/search' ? (params.get('q') ?? '') : '';

  return (
    <>
      <div className="announce" role="status">
        <p key={announcement} className="announce__text">
          {ANNOUNCEMENTS[announcement]}
        </p>
      </div>

      <header className="header">
        <div className="header__main page">
          <button
            type="button"
            className="header__menu"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </button>

          <Link to="/" className="logo" aria-label="Nykaa Fashion home">
            <span className="logo__mark">Nykaa</span>
            <span className="logo__sub">Fashion</span>
          </Link>

          <div className="header__search">
            <SearchBar initialValue={searchValue} />
          </div>

          <div className="header__actions">
            <button type="button" className="header__action header__action--account" title="Account — not part of this MVP" disabled>
              <UserIcon />
              <span>Account</span>
            </button>

            {/* The profile is reused on every product, so it belongs in the
                chrome rather than only inside one product page. */}
            <Link to="/fit-profile" className="header__action" title="Your fit profile">
              <span className="header__action-icon">
                <RulerIcon />
                {hasFitProfile && <span className="header__dot" aria-hidden />}
              </span>
              <span>My Fit</span>
            </Link>

            <Link to="/wishlist" className="header__action">
              <span className="header__action-icon">
                <HeartIcon />
                {wishlist.length > 0 && <span className="header__count">{wishlist.length}</span>}
              </span>
              <span>Wishlist</span>
            </Link>

            <Link to="/bag" className="header__action">
              <span className="header__action-icon">
                <BagIcon />
                {summary.itemCount > 0 && (
                  <span className="header__count">{summary.itemCount}</span>
                )}
              </span>
              <span>Bag</span>
            </Link>
          </div>
        </div>

        <div className="header__nav">
          <div className="page">
            <Navigation />
          </div>
        </div>
      </header>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
