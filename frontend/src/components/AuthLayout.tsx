import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';

/** Root layout: makes auth state available to every route. */
export function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
