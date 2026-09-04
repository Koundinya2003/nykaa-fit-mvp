import { C } from './palette';

/** Rotating announcements in the thin bar above the header. */
export const ANNOUNCEMENTS = [
  'Free delivery on orders above ₹999',
  'Extra 10% off on your first order — code FIRST10',
  'Easy 14-day returns on all fashion',
];

export interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  to: string;
  /** Two hexes driving the generated editorial backdrop. */
  from: string;
  to2: string;
  accent: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-festive',
    eyebrow: 'The Festive Edit',
    title: 'Dressed for\nthe season',
    subtitle: 'Anarkalis, chikankari and satin slips — up to 60% off',
    cta: 'Shop Dresses',
    to: '/c/dresses',
    from: '#f6e2e8',
    to2: '#e7cdd4',
    accent: C.wine,
  },
  {
    id: 'hero-denim',
    eyebrow: 'Denim Room',
    title: 'Every rise,\nevery wash',
    subtitle: "Levi's, Pepe, Spykar and more from ₹1,099",
    cta: 'Shop Jeans',
    to: '/c/jeans',
    from: '#dfe6ef',
    to2: '#c3d0e0',
    accent: C.denimDark,
  },
  {
    id: 'hero-men',
    eyebrow: 'Menswear',
    title: 'Sharp shirts,\nsoft tees',
    subtitle: 'Louis Philippe, Snitch, Jack & Jones — up to 55% off',
    cta: 'Shop Men',
    to: '/c/men',
    from: '#e6e6df',
    to2: '#cfd0c4',
    accent: C.forest,
  },
];

export interface FeaturedCategory {
  label: string;
  caption: string;
  to: string;
  hex: string;
  kind: 'dresses' | 'tops' | 'jeans' | 'shirts' | 't-shirts' | 'shoes';
}

export const FEATURED_CATEGORIES: FeaturedCategory[] = [
  { label: 'Dresses', caption: 'Maxi to mini', to: '/c/dresses', hex: C.wine, kind: 'dresses' },
  { label: 'Tops', caption: 'Everyday layers', to: '/c/tops?sub=tops', hex: C.blush, kind: 'tops' },
  { label: 'Jeans', caption: 'Denim for all', to: '/c/jeans', hex: C.denimMid, kind: 'jeans' },
  { label: 'Shirts', caption: 'Work to weekend', to: '/c/tops?sub=shirts', hex: C.skyBlue, kind: 'shirts' },
  { label: 'T-Shirts', caption: 'Tees & polos', to: '/c/tops?sub=t-shirts', hex: C.olive, kind: 't-shirts' },
  { label: 'Shoes', caption: 'Heels to sneakers', to: '/c/shoes', hex: C.cognac, kind: 'shoes' },
];

export interface EditorialBanner {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  to: string;
  from: string;
  to2: string;
}

export const EDITORIAL_BANNERS: EditorialBanner[] = [
  {
    id: 'ed-work',
    eyebrow: 'Edit 01',
    title: 'The Workwear Edit',
    body: 'Structured shirting, clean denim and shoes that survive a commute.',
    cta: 'Explore',
    to: '/c/women?tag=workwear-edit',
    from: '#eceae4',
    to2: '#d8d4c9',
  },
  {
    id: 'ed-party',
    eyebrow: 'Edit 02',
    title: 'After Dark',
    body: 'Sequins, satin and block heels for the nights that run long.',
    cta: 'Explore',
    to: '/c/women?tag=party-edit',
    from: '#e4dfe8',
    to2: '#cbc2d5',
  },
];

/** Trust strip shown above the footer. */
export const SERVICE_PROMISES = [
  { title: '14-Day Returns', body: 'Free pickup on every fashion order' },
  { title: 'Free Delivery', body: 'On orders above ₹999, pan-India' },
  { title: '100% Authentic', body: 'Sourced directly from brands' },
  { title: 'Secure Checkout', body: 'UPI, cards, netbanking and COD' },
];
