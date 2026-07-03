import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Start every route at the top (route change, refresh, and logo/new-page navigation).
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
