import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  // refetchOnWindowFocus so admin edits (settings/banners/products) show up when
  // you switch back to the storefront tab; short staleTime keeps content fresh.
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true } },
});
