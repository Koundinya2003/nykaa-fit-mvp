import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { getByTag } from '@/data/products';
import ProductImageView from './ProductImage';
import '@/styles/layout.css';

/** Desktop mega-menu. Opens on hover and on keyboard focus; every link in the
 *  panel routes to a real, populated listing. */
export default function Navigation() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <nav className="nav" aria-label="Primary">
      <ul className="nav__list">
        {CATEGORIES.map((cat) => {
          const spotlight = getByTag('bestseller').find((p) =>
            cat.gender === 'all' ? p.category === cat.id : p.gender === cat.gender,
          );

          return (
            <li
              key={cat.id}
              className="nav__item"
              onMouseEnter={() => setOpenId(cat.id)}
              onMouseLeave={() => setOpenId(null)}
            >
              <NavLink
                to={`/c/${cat.id}`}
                className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}
                onFocus={() => setOpenId(cat.id)}
              >
                {cat.label}
              </NavLink>

              <div className={`mega ${openId === cat.id ? 'is-open' : ''}`}>
                <div className="mega__inner page">
                  <div className="mega__cols">
                    {cat.navGroups.map((group) => (
                      <div key={group.title} className="mega__col">
                        <p className="mega__title">{group.title}</p>
                        <ul>
                          {group.links.map((link) => (
                            <li key={link.label}>
                              <Link
                                to={link.to}
                                className="mega__link"
                                onClick={() => setOpenId(null)}
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {spotlight && (
                    <Link
                      to={`/p/${spotlight.id}`}
                      className="mega__spotlight"
                      onClick={() => setOpenId(null)}
                    >
                      <ProductImageView product={spotlight} view="styled" className="mega__img" />
                      <div className="mega__spotlight-body">
                        <p className="eyebrow">Bestseller</p>
                        <p className="mega__spotlight-name">
                          {spotlight.brand} — {spotlight.name}
                        </p>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
