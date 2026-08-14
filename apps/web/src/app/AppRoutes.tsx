import { useRoutes } from 'react-router-dom';
import { routes } from './router';
import { usePageTracking } from '../features/analytics/usePageTracking';

export function AppRoutes() {
  usePageTracking();
  return useRoutes(routes);
}
