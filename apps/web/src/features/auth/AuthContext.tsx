import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserDTO, LoginInput, RegisterInput } from '@herencia/shared';
import * as api from '../../lib/api';

type AuthValue = {
  user: UserDTO | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<UserDTO>;
  register: (input: RegisterInput) => Promise<UserDTO>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setUser(await api.fetchMe());
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, []);

  const login = async (input: LoginInput) => {
    const u = await api.login(input);
    setUser(u);
    return u;
  };
  const register = async (input: RegisterInput) => {
    const u = await api.register(input);
    setUser(u);
    return u;
  };
  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
