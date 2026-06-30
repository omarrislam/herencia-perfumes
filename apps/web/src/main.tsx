import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './app/ThemeProvider';
import { queryClient } from './app/queryClient';
import { router } from './app/router';
import { AuthProvider } from './features/auth/AuthContext';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Suspense fallback={<div className="p-8 text-center font-body text-muted">Loading…</div>}>
            <RouterProvider router={router} />
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
