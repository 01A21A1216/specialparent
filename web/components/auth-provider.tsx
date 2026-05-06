'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { authApi, AuthResult, clearTokens, setTokens } from '../lib/api';

type User = AuthResult['user'];

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const hasToken =
        typeof window !== 'undefined' && localStorage.getItem('sp_access');
      if (hasToken) {
        await refresh();
      }
      setLoading(false);
    })();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  }, []);

  const signup = useCallback(
    async (data: { email: string; password: string; fullName: string; role?: string }) => {
      const res = await authApi.signup(data);
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
