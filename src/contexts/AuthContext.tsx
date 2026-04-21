import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { UserRole, ROLE_HOME } from '../lib/rbac';
import { api } from '../lib/api';

const AUTH_TOKEN_KEY = 'servv_auth_token';

export interface AuthUser {
  id:            string;
  firstName:     string;
  lastName:      string;
  role:          UserRole;
  hotelId:       string | null;
  hotelName:     string | null;
  hasRestaurant: boolean;
}

interface AuthContextValue {
  user:    AuthUser | null;
  loading: boolean;
  login:   (username: string, password: string, hotelId?: string) => Promise<void>;
  logout:  () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, loading: true, login: async () => {}, logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Verify stored session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!storedToken) { setLoading(false); return; }

    api.get<{ user: AuthUser }>('/api/auth/me')
      .then(({ user: u }) => setUser(u))
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('servv_user_id');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string, hotelId?: string) => {
    const data = await api.post<{ user: AuthUser; token: string }>(
      '/api/auth/login',
      { username, password, hotelId: hotelId || undefined },
      'Login',
    );

    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem('servv_user_id', data.user.id);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('servv_user_id');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export { ROLE_HOME };
