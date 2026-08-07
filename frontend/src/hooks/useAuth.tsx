import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthCredentialsDto, AuthUser } from '@occasio/shared';
import { api } from '../lib/api';
import { authStorage } from '../lib/authStorage';

interface AuthContextValue {
  user: AuthUser | null;
  login: (creds: AuthCredentialsDto) => Promise<void>;
  register: (creds: AuthCredentialsDto) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    authStorage.getUser(),
  );

  const login = useCallback(async (creds: AuthCredentialsDto) => {
    const res = await api.login(creds);
    authStorage.save(res.token, res.user);
    setUser(res.user);
  }, []);

  const register = useCallback(async (creds: AuthCredentialsDto) => {
    const res = await api.register(creds);
    authStorage.save(res.token, res.user);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    authStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, register, logout }),
    [user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
