import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { AuthLayout } from './components/AuthLayout';
import { RequireAuth } from './components/RequireAuth';
import { EditorPage } from './pages/EditorPage';
import { ScheduledPage } from './pages/ScheduledPage';
import { AuthPage } from './pages/AuthPage';
import { RenderPage } from './pages/RenderPage';

const router = createBrowserRouter([
  {
    // Root layout provides auth state to every route.
    element: <AuthLayout />,
    children: [
      {
        path: '/',
        element: (
          <RequireAuth>
            <EditorPage />
          </RequireAuth>
        ),
      },
      {
        path: '/scheduled',
        element: (
          <RequireAuth>
            <ScheduledPage />
          </RequireAuth>
        ),
      },
      { path: '/login', element: <AuthPage mode="login" /> },
      { path: '/register', element: <AuthPage mode="register" /> },
      // Public headless-render target loaded by Playwright at send time.
      { path: '/render', element: <RenderPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
