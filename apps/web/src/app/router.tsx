import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { StorefrontLayout } from './StorefrontLayout';
import { RequireAuth } from '../features/auth/RequireAuth';

const Home = lazy(() => import('../pages/Home'));
const Products = lazy(() => import('../pages/Products'));
const ProductDetail = lazy(() => import('../pages/ProductDetail'));
const Bundles = lazy(() => import('../pages/Bundles'));
const Cart = lazy(() => import('../pages/Cart'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Admin = lazy(() => import('../pages/admin/AdminApp'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const Checkout = lazy(() => import('../pages/Checkout'));
const OrderConfirmation = lazy(() => import('../pages/OrderConfirmation'));
const Account = lazy(() => import('../pages/Account'));

export const router = createBrowserRouter([
  {
    element: <StorefrontLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/products', element: <Products /> },
      { path: '/products/:slug', element: <ProductDetail /> },
      { path: '/bundles', element: <Bundles /> },
      { path: '/bundles/:slug', element: <ProductDetail /> },
      { path: '/cart', element: <Cart /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/checkout', element: <Checkout /> },
      { path: '/order-confirmation', element: <OrderConfirmation /> },
      { path: '/account', element: <RequireAuth><Account /></RequireAuth> },
    ],
  },
  { path: '/admin/*', element: <Admin /> },
  { path: '*', element: <NotFound /> },
]);
