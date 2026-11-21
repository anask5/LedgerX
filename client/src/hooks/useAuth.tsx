import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth';
import { secureStore } from '../lib/secureStore';
import type { User, AuthTokens } from '../api/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      const token = await secureStore.getAccessToken();
      if (!token) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      const user = await authApi.getMe();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch (err: any) {
      // Only wipe stored tokens if unauthorized/invalid session; keep token on transient network/timeout errors
      if (err?.code === '401' || err?.status === 401) {
        await secureStore.clearTokens();
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const tokens: AuthTokens = await authApi.login({ email, password });
    await secureStore.setTokens(tokens.access_token, tokens.refresh_token);
    const user = await authApi.getMe();
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const tokens: AuthTokens = await authApi.signup({ name, email, password });
    await secureStore.setTokens(tokens.access_token, tokens.refresh_token);
    const user = await authApi.getMe();
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout request errors
    }
    await secureStore.clearTokens();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.getMe();
      setState((prev) => ({ ...prev, user }));
    } catch {
      // Ignore transient refresh errors
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}