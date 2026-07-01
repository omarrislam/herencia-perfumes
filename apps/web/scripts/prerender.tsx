/* @jsxRuntime automatic */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';
import { StrictMode, Suspense } from 'react';
import { StaticRouter } from 'react-router-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/app/ThemeProvider';
import { AppRoutes } from '../src/app/AppRoutes';
import { AuthProvider } from '../src/features/auth/AuthContext';
import { CartProvider } from '../src/features/cart/CartContext';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, '../dist');
const template = readFileSync(resolve(dist, 'index.html'), 'utf-8');

const ROUTES = ['/', '/find-your-scent', '/login', '/register', '/blog'];

for (const url of ROUTES) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  const html = renderToString(
    <StrictMode>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <CartProvider>
            <ThemeProvider>
              <StaticRouter location={url}>
                <Suspense fallback={null}>
                  <AppRoutes />
                </Suspense>
              </StaticRouter>
            </ThemeProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
  const page = template.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  const outPath = url === '/' ? resolve(dist, 'index.html') : resolve(dist, `.${url}/index.html`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, page);
  console.log('prerendered', url);
}
