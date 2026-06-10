import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authStorage } from '../utils/auth';
import type { UserProfile } from '../utils/auth';
import { AUTH_EXPIRED_EVENT } from '../services/api';
import { toast } from 'sonner';

import { api } from '../services/api';

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: (expired?: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(authStorage.getToken());
  const [user, setUserState] = useState<UserProfile | null>(authStorage.getUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback((expired: boolean = false) => {
    authStorage.clearSession();
    setTokenState(null);
    setUserState(null);

    if (expired) {
      toast.error('Sua sessão expirou. Faça login novamente.', {
        id: 'session-expired-toast', // Avoids duplicate toast notifications
        duration: 5000,
      });
      // Safe redirect avoiding loops
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/session-expired')) {
        window.location.href = `/session-expired?from=${encodeURIComponent(window.location.pathname)}`;
      }
    } else {
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
  }, []);

  const login = useCallback((newToken: string, newUser: UserProfile) => {
    authStorage.setToken(newToken);
    authStorage.setUser(newUser);
    setTokenState(newToken);
    setUserState(newUser);
    toast.success(`Bem-vindo de volta, ${newUser.nome}!`);
  }, []);

  // Validate session and sync full profile whenever the token changes
  // (on mount AND right after login, so guards like ModuleGuard see activeModules)
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      if (token) {
        if (authStorage.isTokenExpired(token)) {
          logout(true);
          return;
        }
        setIsLoading(true);
        try {
          const response = await api.get('/auth/me');
          if (cancelled) return;
          const latestUser = response.data;
          authStorage.setUser(latestUser);
          setUserState(latestUser);
        } catch (error) {
          console.error('Failed to sync user session payload:', error);
        }
      }
      if (!cancelled) setIsLoading(false);
    };

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  // Global listeners for axios response 401s / expired events
  useEffect(() => {
    const handleAuthExpired = () => {
      logout(true);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [logout]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !authStorage.isTokenExpired(token || ''),
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
