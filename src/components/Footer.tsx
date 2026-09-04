import { Link } from 'react-router-dom';
import { SERVICE_PROMISES } from '@/data/homeContent';
import { ReturnIcon, ShieldIcon, TruckIcon, CheckIcon } from './Icons';
import '@/styles/layout.css';

const PROMISE_ICONS = [ReturnIcon, TruckIcon, ShieldIcon, CheckIcon];

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'Women', to: '/c/women' },
      { label: 'Men', to: '/c/men' },
      { label: 'Dresses', to: '/c/dresses' },
      { label: 'Jeans', to: '/c/jeans' },
      { label: 'Shoes', to: '/c/shoes' },
    ],
  },
  {
    title: 'Edits',
    links: [
      { label: 'Festive Edit', to: '/c/women?tag=festive-edit' },
      { label: 'Workwear Edit', to: '/c/women?tag=workwear-edit' },
      { label: 'Party Edit', to: '/c/women?tag=party-edit' },
      { label: 'Summer Edit', to: '/c/men?tag=summer-edit' },
    ],
  },
  {
    title: 'Your Account',
    links: [
      { label: 'Shopping Bag', to: '/bag' },
      { label: 'Wishlist', to: '/wishlist' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__promises">
        <div className="page footer__promises-inner">
          {SERVICE_PROMISES.map((p, i) => {
            const Icon = PROMISE_ICONS[i % PROMISE_ICONS.length];
            return (
              <div key={p.title} className="promise">
                <Icon size={22} />
                <div>
                  <p className="promise__title">{p.title}</p>
                  <p className="promise__body">{p.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="page footer__main">
        <div className="footer__brand">
          <span className="logo logo--footer">
            <span className="logo__mark">Nykaa</span>
            <span className="logo__sub">Fashion</span>
          </span>
          <p className="footer__blurb">
            A study prototype of a modern Indian fashion marketplace, built as the foundation for
            Nykaa&nbsp;Fit — personalised size and fit guidance.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} className="footer__col" aria-label={col.title}>
            <p className="footer__col-title">{col.title}</p>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="footer__link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="footer__col">
          <p className="footer__col-title">About This Build</p>
          <ul className="footer__notes">
            <li>Mock catalogue — 60 products, no live API</li>
            <li>Illustrated product imagery, generated locally</li>
            <li>Bag, wishlist &amp; fit profile in localStorage</li>
            <li>
              <Link to="/fit-lab" className="footer__link footer__link--inline">
                Nykaa Fit — Lab
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer__base">
        <div className="page footer__base-inner">
          <p>Nykaa Fit MVP · Portfolio prototype · Not affiliated with Nykaa</p>
          <p>Prices in INR · Illustrative data only</p>
        </div>
      </div>
    </footer>
  );
}
