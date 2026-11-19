import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Analyst' | 'Collector' | 'Viewer';
  market_ids: string[];
  status: string;
  must_change_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (token: string, refreshToken: string, userData: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setSessionExpired: (expired: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('pricepulse_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem('pricepulse_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await apiFetch<User>('/auth/me');
        setUser(me);
      } catch (err: any) {
        if (err.code === 'TOKEN_EXPIRED' || err.statusCode === 401) {
          setSessionExpired(true);
        }
        localStorage.removeItem('pricepulse_token');
        localStorage.removeItem('pricepulse_refresh');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('pricepulse_token', accessToken);
    localStorage.setItem('pricepulse_refresh', refreshToken);
    setToken(accessToken);
    setUser(userData);
    setSessionExpired(false);
  };

  const logout = () => {
    localStorage.removeItem('pricepulse_token');
    localStorage.removeItem('pricepulse_refresh');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        sessionExpired,
        login,
        logout,
        updateUser,
        setSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
