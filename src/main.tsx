import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ShopProvider } from '@/context/ShopContext';
import { applyVariantFromSearch } from '@/features/nykaa-fit';
import App from './App';
import '@/styles/global.css';

// ?fit=on / ?fit=off pins the experiment bucket before the first render, so a
// reviewer can jump straight into either arm of the test.
applyVariantFromSearch(window.location.search);

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <ShopProvider>
        <App />
      </ShopProvider>
    </BrowserRouter>
  </StrictMode>,
);
