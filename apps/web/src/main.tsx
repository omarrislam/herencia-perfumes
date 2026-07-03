import { StrictMode, Suspense } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './app/ThemeProvider';
import { queryClient } from './app/queryClient';
import { AppRoutes } from './app/AppRoutes';
import { AuthProvider } from './features/auth/AuthContext';
import { CartProvider } from './features/cart/CartContext';
import { PageLoader } from './components/PageLoader';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/jost/300.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import '@fontsource/jost/700.css';
import './styles/index.css';

const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <ThemeProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <AppRoutes />
              </Suspense>
            </BrowserRouter>
          </ThemeProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);

const root = document.getElementById('root')!;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);

// Fade out the first-load splash once React has mounted (the branded PageLoader
// takes over seamlessly if a lazy route is still loading).
function hideSplash() {
  const s = document.getElementById('app-splash');
  if (!s) return;
  s.classList.add('splash-hide');
  setTimeout(() => s.remove(), 500);
}
requestAnimationFrame(() => requestAnimationFrame(hideSplash));
