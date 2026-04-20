import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { UserRole, ROLE_HOME } from '../lib/rbac';

const API = (import.meta as any).env.VITE_API_URL ?? 'http://localhost:4000';

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
    const storedId = localStorage.getItem('servv_user_id');
    if (!storedId) { setLoading(false); return; }

    fetch(`${API}/api/auth/me`, { headers: { 'x-user-id': storedId } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(({ user: u }) => setUser(u))
      .catch(() => { localStorage.removeItem('servv_user_id'); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string, hotelId?: string) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password, hotelId: hotelId || undefined }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Login failed');

    localStorage.setItem('servv_user_id', data.user.id);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
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
