import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken } from './api.js';

interface User {
  id: string;
  email: string;
}

interface AuthValue {
  user: User | null;
  /** True until the stored token has been checked against the backend. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

/**
 * React Context lets any component read the signed-in user without the value
 * being threaded through every component in between ("prop drilling").
 * AuthProvider owns the state; useAuth() reads it.
 */
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Runs once on mount. A token in localStorage is not proof of anything -
  // it may be expired or belong to a deleted account - so it is verified
  // against /auth/me before the app treats the user as signed in.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const authenticate = useCallback(
    async (path: '/auth/login' | '/auth/signup', email: string, password: string) => {
      const result = await api<{ accessToken: string; user: User }>(path, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(result.accessToken);
      setUser(result.user);
    },
    [],
  );

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      login: (email, password) => authenticate('/auth/login', email, password),
      signup: (email, password) => authenticate('/auth/signup', email, password),
      logout: () => {
        setToken(null);
        setUser(null);
      },
    }),
    // useMemo keeps this object identity stable between renders, so consumers
    // do not re-render every time the provider does.
    [user, loading, authenticate],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
