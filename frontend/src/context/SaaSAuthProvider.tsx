import React, { createContext, useState, useEffect, useCallback } from 'react';
import { SaaSAPIService, SAAS_AUTH_EXPIRED_EVENT } from '../services/saas';
import { toast } from 'sonner';

export interface SaaSUser {
  id: string;
  nome: string;
  email: string;
  status: string;
  role: string;
  permissions: string[];
}

export interface SaaSAuthContextType {
  user: SaaSUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: SaaSUser) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const SaaSAuthContext = createContext<SaaSAuthContextType | undefined>(undefined);

export function SaaSAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('saas_token'));
  const [user, setUser] = useState<SaaSUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem('saas_token');
    setToken(null);
    setUser(null);
    if (!window.location.pathname.includes('/administracao/login')) {
      window.location.href = '/administracao/login';
    }
  }, []);

  const login = useCallback((newToken: string, newUser: SaaSUser) => {
    localStorage.setItem('saas_token', newToken);
    setToken(newToken);
    setUser(newUser);
    toast.success(`Administrador ${newUser.nome} autenticado com sucesso!`);
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.permissions.includes('total')) return true;
    return user.permissions.includes(permission);
  }, [user]);

  useEffect(() => {
    const validateSession = async () => {
      const storedToken = localStorage.getItem('saas_token');
      if (storedToken) {
        try {
          const userData = await SaaSAPIService.me();
          setUser(userData);
        } catch (error) {
          console.error('Sessão administrativa inválida ou expirada:', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    validateSession();
  }, [token, logout]);

  useEffect(() => {
    const handleAuthExpired = () => {
      toast.error('Sessão administrativa expirou. Faça login novamente.');
      logout();
    };

    window.addEventListener(SAAS_AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(SAAS_AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [logout]);

  const value: SaaSAuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    hasPermission
  };

  return <SaaSAuthContext.Provider value={value}>{children}</SaaSAuthContext.Provider>;
}
