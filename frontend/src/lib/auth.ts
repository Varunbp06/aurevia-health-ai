/**
 * Aurevia Health AI — Auth Store (Zustand)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setTokenGetter, type UserProfile } from './api';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  /** True when inside a frontend-only demo session (no live backend). */
  isDemo: boolean;
  setAuth: (token: string, user: UserProfile, isDemo?: boolean) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const memoryStore = new Map<string, string>();

const safeStorage = createJSONStorage(() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Test storage access
      window.localStorage.getItem('test');
      return window.localStorage;
    }
  } catch {
    // Storage restricted (e.g. iframe partitioning)
  }
  return {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => memoryStore.set(key, value),
    removeItem: (key: string) => memoryStore.delete(key),
  };
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isDemo: false,
      setAuth: (token, user, isDemo = false) => set({ token, user, isDemo }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null, isDemo: false }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'healthcare-auth',
      storage: safeStorage,
    }
  )
);

// Wire up the API client to read the token from the store
if (typeof window !== 'undefined') {
  setTokenGetter(() => useAuthStore.getState().token);
}
