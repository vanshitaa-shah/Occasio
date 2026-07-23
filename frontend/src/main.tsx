import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { EditorPage } from './pages/EditorPage';
import { RenderPage } from './pages/RenderPage';

const router = createBrowserRouter([
  { path: '/', element: <EditorPage /> },
  // Headless-render target: Playwright loads this route at send time (Phase 3).
  { path: '/render', element: <RenderPage /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
