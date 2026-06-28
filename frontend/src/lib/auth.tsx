import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { apiClient, setAccessToken } from './api-client';
import { authApi } from '@/features/auth/api';

export interface CurrentUser {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  photo_url: string | null;
  preferred_language: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  search_radius_km?: number;
  roles: string[];
}

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: Partial<CurrentUser> & { id: string }) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/users/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    }
  }, []);

  // On mount, attempt a silent refresh using the httpOnly cookie. If it
  // succeeds, fetch the full profile. This is what makes "stay logged in
  // across page reloads" work without storing the access token anywhere
  // persistent (by design — access tokens live in memory only).
  useEffect(() => {
    async function bootstrap() {
      try {
        const res = await apiClient.post('/auth/refresh');
        setAccessToken(res.data.accessToken);
        await refreshUser();
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    bootstrap();
  }, [refreshUser]);

  useEffect(() => {
    function handleSessionExpired() {
      setAccessToken(null);
      setUser(null);
    }
    window.addEventListener('locallink:session-expired', handleSessionExpired);
    return () => window.removeEventListener('locallink:session-expired', handleSessionExpired);
  }, []);

  const setSession = useCallback((accessToken: string, partialUser: Partial<CurrentUser> & { id: string }) => {
    setAccessToken(accessToken);
    setUser((prev) => ({ ...prev, ...partialUser, roles: partialUser.roles ?? prev?.roles ?? [] } as CurrentUser));
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: Boolean(user), setSession, refreshUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
