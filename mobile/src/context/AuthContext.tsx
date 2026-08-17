import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setAuthToken } from '../api/client';
import { AuthUser } from '../api/types';

// SecureStore, not AsyncStorage — this holds a bearer token, and
// AsyncStorage is unencrypted on-device storage. Same reasoning as the
// backend never storing a plaintext OTP.
const TOKEN_KEY = 'trekpermit_access_token';
const USER_KEY = 'trekpermit_user';

interface AuthContextValue {
  user: AuthUser | null;
  /** True only during the initial rehydrate-from-storage check on launch. */
  isLoading: boolean;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [token, storedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (token && storedUser) {
        setAuthToken(token);
        setUser(JSON.parse(storedUser) as AuthUser);
      }
      setIsLoading(false);
    })();
  }, []);

  async function signIn(token: string, nextUser: AuthUser): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser)),
    ]);
    setAuthToken(token);
    setUser(nextUser);
  }

  async function signOut(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
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
