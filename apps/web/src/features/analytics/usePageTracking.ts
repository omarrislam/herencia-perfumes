import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { track, flush } from '../../lib/analytics';

/**
 * Fires page_view on every route change. Mounted once, inside the router.
 *
 * A SPA only loads the document once, so without this the entire visit would look
 * like a single pageview no matter how much the visitor browsed.
 */
export function usePageTracking(): void {
  const { pathname } = useLocation();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    track('page_view', { path: pathname });
    void flush();
  }, [pathname]);

  // A visitor who leaves still has queued events worth keeping. Both listeners are
  // needed: visibilitychange covers tab switches and backgrounding, pagehide covers
  // a hard navigation away, where visibilitychange is not reliably delivered before
  // teardown (this is why product_view went missing in production verification).
  // Duplicate flushes are harmless — flush() no-ops on an empty queue.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);
}
