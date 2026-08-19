'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { setAuthToken } from './api/client';
import { AuthUser } from './types';

// Plain localStorage, not an httpOnly cookie — this mirrors the mobile
// app's own posture (a bearer token, sent as an Authorization header, kept
// client-side) rather than inventing a cookie-based session the backend
// doesn't actually support. Acceptable for a pilot's internal tool; a
// production dashboard handling this for real would want httpOnly cookies
// set by a same-origin proxy, to keep the token out of reach of any
// injected script.
const TOKEN_KEY = 'trekpermit_dashboard_token';
const USER_KEY = 'trekpermit_dashboard_user';

interface AuthContextValue {
  user: AuthUser | null;
  /** True only during the initial rehydrate-from-storage check on load. */
  isLoading: boolean;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (token && storedUser) {
      setAuthToken(token);
      setUser(JSON.parse(storedUser) as AuthUser);
    }
    setIsLoading(false);
  }, []);

  function signIn(token: string, nextUser: AuthUser): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setAuthToken(token);
    setUser(nextUser);
  }

  function signOut(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
