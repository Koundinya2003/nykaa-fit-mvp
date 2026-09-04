import { Route, Routes } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Toasts from '@/components/Toasts';
import ScrollToTop from '@/components/ScrollToTop';
import HomePage from '@/pages/HomePage';
import ListingPage from '@/pages/ListingPage';
import SearchPage from '@/pages/SearchPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import BagPage from '@/pages/BagPage';
import WishlistPage from '@/pages/WishlistPage';
import CheckoutPage from '@/pages/CheckoutPage';
import FitLabPage from '@/pages/FitLabPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <div className="app-shell">
      <ScrollToTop />
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/c/:categoryId" element={<ListingPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/p/:productId" element={<ProductDetailPage />} />
          <Route path="/bag" element={<BagPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          {/* Internal instrumentation view — see FitLabPage. */}
          <Route path="/fit-lab" element={<FitLabPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <Toasts />
    </div>
  );
}
