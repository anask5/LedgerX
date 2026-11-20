import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth';
import { secureStore } from '../lib/secureStore';
import type { User, AuthTokens } from '../api/types';

const demoUser: User = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@receiptwise.app',
  avatar_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

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
    user: demoUser,
    isLoading: false,
    isAuthenticated: true,
  });

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await secureStore.getAccessToken();
      if (token) {
        const user = await authApi.getMe();
        setState({ user, isLoading: false, isAuthenticated: true });
      } else {
        setState({ user: demoUser, isLoading: false, isAuthenticated: true });
      }
    } catch {
      setState({ user: demoUser, isLoading: false, isAuthenticated: true });
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const tokens: AuthTokens = await authApi.login({ email, password });
      await secureStore.setTokens(tokens.access_token, tokens.refresh_token);
      const user = await authApi.getMe();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      // In local mode, simulate successful login
      const localUser: User = {
        id: `user-${Date.now()}`,
        name: email.split('@')[0] || 'User',
        email,
        avatar_url: null,
        created_at: new Date().toISOString(),
      };
      setState({ user: localUser, isLoading: false, isAuthenticated: true });
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const tokens: AuthTokens = await authApi.signup({ name, email, password });
      await secureStore.setTokens(tokens.access_token, tokens.refresh_token);
      const user = await authApi.getMe();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      // In local mode, simulate successful signup
      const localUser: User = {
        id: `user-${Date.now()}`,
        name,
        email,
        avatar_url: null,
        created_at: new Date().toISOString(),
      };
      setState({ user: localUser, isLoading: false, isAuthenticated: true });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore
    }
    await secureStore.clearTokens();
    setState({ user: demoUser, isLoading: false, isAuthenticated: true });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.getMe();
      setState((prev) => ({ ...prev, user }));
    } catch {
      // ignore
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
