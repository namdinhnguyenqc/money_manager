/**
 * TrọCare Mobile — Auth Helpers
 * Google OAuth login, token refresh, logout, identity check.
 * Follows 08-mobile/mobile-compatibility.md spec.
 */

import { Platform } from 'react-native';
import {
  apiPost,
  apiGet,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
} from './api';

export type UserRole = 'OWNER' | 'TENANT' | 'GUEST' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status?: string;
  approvalStatus?: string;
  is_profile_completed?: boolean;
  isProfileCompleted?: boolean;
  onboardingStep?: 'COMPLETE_PROFILE' | 'PENDING_APPROVAL' | 'DONE';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  profile?: any;
  nextStep?: 'COMPLETE_PROFILE' | 'PENDING_APPROVAL' | 'DONE' | 'DASHBOARD';
}

export function getProfileCompleted(user?: AuthUser | null, fallback = false): boolean {
  return Boolean(user?.is_profile_completed ?? user?.isProfileCompleted ?? fallback);
}

/**
 * Login via Google OAuth ID token.
 * Mobile uses POST /auth/owner-google with platform, deviceId, fcmToken.
 */
export async function loginWithGoogle(
  idToken: string,
  deviceId?: string,
  fcmToken?: string
): Promise<LoginResponse> {
  const res = await apiPost<any>('/auth/owner-google', {
    idToken,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    deviceId: deviceId || 'unknown',
    fcmToken: fcmToken || undefined,
  });

  const data = res?.data ?? res;

  // Persist tokens
  if (data.accessToken) await setAccessToken(data.accessToken);
  if (data.refreshToken) await setRefreshToken(data.refreshToken);

  return data as LoginResponse;
}

/**
 * Check current authentication status.
 */
export async function checkAuth(): Promise<AuthUser | null> {
  try {
    const res = await apiGet<any>('/auth/me');
    const data = res?.data ?? res;
    return (data?.user ?? data) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Logout — clears tokens and deregisters FCM.
 */
export async function logout(fcmToken?: string): Promise<void> {
  try {
    const refreshToken = await getRefreshToken();
    await apiPost<any>('/auth/logout', {
      refreshToken,
      fcmToken: fcmToken || undefined,
    });
  } catch {
    // Silently fail — still clear local tokens
  } finally {
    await clearTokens();
  }
}
