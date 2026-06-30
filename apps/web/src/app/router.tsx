import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { StorefrontLayout } from './StorefrontLayout';

const Home = lazy(() => import('../pages/Home'));
const Products = lazy(() => import('../pages/Products'));
const ProductDetail = lazy(() => import('../pages/ProductDetail'));
const Bundles = lazy(() => import('../pages/Bundles'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Admin = lazy(() => import('../pages/admin/AdminApp'));

export const router = createBrowserRouter([
  {
    element: <StorefrontLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/products', element: <Products /> },
      { path: '/products/:slug', element: <ProductDetail /> },
      { path: '/bundles', element: <Bundles /> },
      { path: '/bundles/:slug', element: <ProductDetail /> },
    ],
  },
  { path: '/admin/*', element: <Admin /> },
  { path: '*', element: <NotFound /> },
]);
