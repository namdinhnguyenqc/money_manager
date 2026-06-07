/**
 * TrọCare Mobile — Auth Store (Zustand)
 * Manages authentication state: user, tokens, profile completion.
 * Hydrates from SecureStore on app launch.
 */

import { create } from 'zustand';
import type { AuthUser } from '@/lib/auth';
import { ApiClientError, getAccessToken, clearTokens } from '@/lib/api';
import { checkAuth, getApprovalStatus, getProfileCompleted, logout as authLogout } from '@/lib/auth';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isProfileCompleted: boolean;
  approvalStatus: string | null;
  onboardingStep: string | null;
  isLoading: boolean;
  isHydrated: boolean;

  /** Hydrate auth state from secure storage on app launch */
  hydrate: () => Promise<void>;

  /** Set user after successful login */
  setUser: (user: AuthUser, isProfileCompleted?: boolean) => void;

  /** Logout and clear all state */
  logout: (fcmToken?: string) => Promise<void>;

  /** Mark profile as completed after onboarding */
  markProfilePendingApproval: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isProfileCompleted: false,
  approvalStatus: null,
  onboardingStep: null,
  isLoading: true,
  isHydrated: false,

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isProfileCompleted: false, approvalStatus: null, onboardingStep: null, isLoading: false, isHydrated: true });
        return;
      }

      const user = await checkAuth();
      if (user) {
        set({
          user,
          isAuthenticated: true,
          isProfileCompleted: getProfileCompleted(user),
          approvalStatus: getApprovalStatus(user),
          onboardingStep: user.onboardingStep ?? null,
          isLoading: false,
          isHydrated: true,
        });
      } else {
        await clearTokens();
        set({ user: null, isAuthenticated: false, isProfileCompleted: false, approvalStatus: null, onboardingStep: null, isLoading: false, isHydrated: true });
      }
    } catch (error) {
      if (error instanceof ApiClientError && ![400, 401, 403].includes(error.status)) {
        set({ isLoading: false, isHydrated: true });
        return;
      }
      await clearTokens();
      set({ user: null, isAuthenticated: false, isProfileCompleted: false, approvalStatus: null, onboardingStep: null, isLoading: false, isHydrated: true });
    }
  },

  setUser: (user, isProfileCompleted) => {
    set({
      user,
      isAuthenticated: true,
      isProfileCompleted: isProfileCompleted ?? getProfileCompleted(user),
      approvalStatus: getApprovalStatus(user),
      onboardingStep: user.onboardingStep ?? null,
      isLoading: false,
    });
  },

  logout: async (fcmToken) => {
    try {
      await authLogout(fcmToken);
    } finally {
      set({ user: null, isAuthenticated: false, isProfileCompleted: false, approvalStatus: null, onboardingStep: null });
    }
  },

  markProfilePendingApproval: () => {
    set((state) => ({
      isProfileCompleted: true,
      approvalStatus: 'PENDING_APPROVAL',
      onboardingStep: 'PENDING_APPROVAL',
      user: state.user ? { ...state.user, status: 'PENDING_APPROVAL', approvalStatus: 'PENDING_APPROVAL', onboardingStep: 'PENDING_APPROVAL' } : state.user,
    }));
  },
}));
