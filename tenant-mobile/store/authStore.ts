/**
 * TrọCare Tenant Mobile — Auth Store (Zustand)
 * Manages authentication state: user, tokens, profile completion.
 * Hydrates from SecureStore on app launch.
 */

import { create } from 'zustand';
import type { AuthUser } from '../lib/auth';
import { ApiClientError, getAccessToken, clearTokens } from '../lib/api';
import { checkAuthStatus, logoutTenant } from '../lib/auth';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;

  /** Hydrate auth state from secure storage on app launch */
  hydrate: () => Promise<void>;

  /** Set user after successful login */
  setUser: (user: AuthUser) => void;

  /** Logout and clear all state */
  logout: (fcmToken?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isHydrated: false,

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false, isHydrated: true });
        return;
      }

      const user = await checkAuthStatus();
      if (user) {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isHydrated: true,
        });
      } else {
        await clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false, isHydrated: true });
      }
    } catch (error) {
      if (error instanceof ApiClientError && ![400, 401, 403].includes(error.status)) {
        set({ isLoading: false, isHydrated: true });
        return;
      }
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false, isHydrated: true });
    }
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async (fcmToken) => {
    try {
      await logoutTenant(fcmToken);
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
