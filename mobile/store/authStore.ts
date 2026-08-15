/**
 * TrọCare Mobile — Auth Store (Zustand)
 * Manages authentication state: user, tokens, profile completion.
 * Hydrates from SecureStore on app launch.
 */

import { create } from 'zustand';
import type { AuthUser } from '@/lib/auth';
import { ApiClientError, getAccessToken, clearTokens } from '@/lib/api';
import { checkAuth, getApprovalStatus, getProfileCompleted, logout as authLogout } from '@/lib/auth';
import { logPerfEvent } from '@/lib/telemetry/appPerformance';
import { markLoginTimeline } from '@/lib/telemetry/loginTimeline';
import { useFacilityStore } from '@/store/facilityStore';

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

// Android Keystore can take several seconds after a cold boot or an overnight
// idle period. A short timeout makes a valid session look like a logout.
const SECURE_STORE_READ_TIMEOUT_MS = 8000;

class SecureStoreReadTimeoutError extends Error {
  constructor() {
    super('SecureStore read timed out');
    this.name = 'SecureStoreReadTimeoutError';
  }
}

async function getAccessTokenWithTimeout(): Promise<string | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      getAccessToken(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new SecureStoreReadTimeoutError()), SECURE_STORE_READ_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

const clearUserCaches = () => {
  useFacilityStore.getState().clearCache();
};

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    if (typeof atob !== 'function') return null;
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getUserFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.sub || !payload?.email || !payload?.role) return null;
  // An expired access token still contains a valid cached identity. Keep it long
  // enough for checkAuth() to run the refresh-token flow. Clearing both tokens
  // here used to sign users out whenever they reopened the app after JWT expiry.
  return {
    id: String(payload.sub),
    email: String(payload.email),
    role: payload.role,
    status: payload.status,
    approvalStatus: payload.approvalStatus,
    isProfileCompleted: payload.isProfileCompleted,
    onboardingStep: payload.onboardingStep,
  } as AuthUser;
}

function authenticatedStateFromToken(token: string) {
  const user = getUserFromToken(token);
  if (!user) return null;
  return {
    user,
    isAuthenticated: true,
    isProfileCompleted: getProfileCompleted(user),
    approvalStatus: getApprovalStatus(user),
    onboardingStep: user.onboardingStep ?? null,
    isLoading: false,
    isHydrated: true,
  } as const;
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
    markLoginTimeline("TOKEN_HYDRATE_START");
    logPerfEvent("TOKEN_HYDRATE_START");
    set({ isLoading: true });
    try {
      const token = await getAccessTokenWithTimeout();
      if (!token) {
        set({ user: null, isAuthenticated: false, isProfileCompleted: false, approvalStatus: null, onboardingStep: null, isLoading: false, isHydrated: true });
        markLoginTimeline("TOKEN_HYDRATE_DONE", { hasToken: false, authenticated: false });
        logPerfEvent("TOKEN_HYDRATE_DONE", { hasToken: false, authenticated: false });
        return;
      }

      const authenticatedState = authenticatedStateFromToken(token);
      if (!authenticatedState) {
        await clearTokens();
        clearUserCaches();
        set({ user: null, isAuthenticated: false, isProfileCompleted: false, approvalStatus: null, onboardingStep: null, isLoading: false, isHydrated: true });
        markLoginTimeline("TOKEN_HYDRATE_DONE", { hasToken: true, authenticated: false, invalidToken: true });
        logPerfEvent("TOKEN_HYDRATE_DONE", { hasToken: true, authenticated: false, invalidToken: true });
        return;
      }

      set(authenticatedState);
      markLoginTimeline("TOKEN_HYDRATE_DONE", { hasToken: true, authenticated: true, source: "token" });
      logPerfEvent("TOKEN_HYDRATE_DONE", { hasToken: true, authenticated: true, source: "token" });

      checkAuth()
        .then((user) => {
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
            return;
          }

          clearTokens().finally(() => {
            clearUserCaches();
            set({ user: null, isAuthenticated: false, isProfileCompleted: false, approvalStatus: null, onboardingStep: null, isLoading: false, isHydrated: true });
          });
        })
        .catch((error) => {
          if (error instanceof ApiClientError && ![400, 401, 403].includes(error.status)) {
            return;
          }
          clearTokens().finally(() => {
            clearUserCaches();
            set({ user: null, isAuthenticated: false, isProfileCompleted: false, approvalStatus: null, onboardingStep: null, isLoading: false, isHydrated: true });
          });
        });
    } catch (error) {
      if (error instanceof SecureStoreReadTimeoutError) {
        // Never delete a session merely because Android Keystore was slow.
        // Complete the delayed read in the background and restore the user as
        // soon as it returns; the routing guard then leaves Login automatically.
        set({
          user: null,
          isAuthenticated: false,
          isProfileCompleted: false,
          approvalStatus: null,
          onboardingStep: null,
          isLoading: false,
          isHydrated: true,
        });
        markLoginTimeline('TOKEN_HYDRATE_DONE', { authenticated: false, storageTimeout: true });
        logPerfEvent('TOKEN_HYDRATE_DONE', { authenticated: false, storageTimeout: true });
        void getAccessToken().then((lateToken) => {
          const lateState = lateToken ? authenticatedStateFromToken(lateToken) : null;
          if (!lateState) return;
          set(lateState);
          markLoginTimeline('TOKEN_HYDRATE_RECOVERED', { source: 'delayed_secure_store_read' });
          logPerfEvent('TOKEN_HYDRATE_RECOVERED', { source: 'delayed_secure_store_read' });
          // `/auth/me` also refreshes an expired access token. It must not
          // clear storage on transient offline/cold-start failures.
          void checkAuth().then((user) => {
            if (!user) return;
            set({
              user,
              isAuthenticated: true,
              isProfileCompleted: getProfileCompleted(user),
              approvalStatus: getApprovalStatus(user),
              onboardingStep: user.onboardingStep ?? null,
              isLoading: false,
              isHydrated: true,
            });
          }).catch(() => {
            // The cached session remains usable until the server is reachable.
          });
        }).catch(() => {
          // No action: this is a storage read failure, never a reason to erase tokens.
        });
        return;
      }
      if (error instanceof ApiClientError && ![400, 401, 403].includes(error.status)) {
        set({ isLoading: false, isHydrated: true });
        markLoginTimeline("TOKEN_HYDRATE_DONE", { hasToken: true, authenticated: false, transientError: true, status: error.status });
        logPerfEvent("TOKEN_HYDRATE_DONE", { hasToken: true, authenticated: false, transientError: true, status: error.status });
        return;
      }
      await clearTokens();
      clearUserCaches();
      set({ user: null, isAuthenticated: false, isProfileCompleted: false, approvalStatus: null, onboardingStep: null, isLoading: false, isHydrated: true });
      markLoginTimeline("TOKEN_HYDRATE_DONE", { authenticated: false });
      logPerfEvent("TOKEN_HYDRATE_DONE", { authenticated: false });
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
      clearUserCaches();
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
