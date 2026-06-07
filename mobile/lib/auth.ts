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
  ApiClientError,
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
  onboardingStep?: 'COMPLETE_PROFILE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DONE';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  profile?: any;
  nextStep?: 'COMPLETE_PROFILE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DONE' | 'DASHBOARD';
}

export function getProfileCompleted(user?: AuthUser | null, fallback = false): boolean {
  const explicitCompleted = user?.is_profile_completed ?? user?.isProfileCompleted;
  if (typeof explicitCompleted === 'boolean') return explicitCompleted;
  if (['PENDING_APPROVAL', 'REJECTED', 'DONE'].includes(String(user?.onboardingStep || '').toUpperCase())) return true;
  return fallback;
}

export function getApprovalStatus(user?: AuthUser | null): string | null {
  const onboardingStep = String(user?.onboardingStep || '').toUpperCase();
  if (onboardingStep === 'PENDING_APPROVAL' || onboardingStep === 'REJECTED') return onboardingStep;
  if (onboardingStep === 'DONE') return String(user?.approvalStatus || user?.status || 'ACTIVE').toUpperCase();
  return user?.approvalStatus ? String(user.approvalStatus).toUpperCase() : user?.status ? String(user.status).toUpperCase() : null;
}

export function isDashboardReady(user?: AuthUser | null, nextStep?: string | null): boolean {
  return (
    String(user?.status || '').toUpperCase() === 'ACTIVE' &&
    getApprovalStatus(user) === 'ACTIVE' &&
    String(user?.onboardingStep || '').toUpperCase() === 'DONE' &&
    String(nextStep || 'DASHBOARD').toUpperCase() === 'DASHBOARD'
  );
}

export function isPendingApproval(user?: AuthUser | null, nextStep?: string | null): boolean {
  return (
    String(nextStep || '').toUpperCase() === 'PENDING_APPROVAL' ||
    String(user?.onboardingStep || '').toUpperCase() === 'PENDING_APPROVAL' ||
    String(user?.approvalStatus || '').toUpperCase() === 'PENDING_APPROVAL' ||
    String(user?.status || '').toUpperCase() === 'PENDING_APPROVAL'
  );
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
  }, { auth: false, retry: false });

  const data = res?.data ?? res;

  // Persist tokens
  await Promise.all([
    data.accessToken ? setAccessToken(data.accessToken) : Promise.resolve(),
    data.refreshToken ? setRefreshToken(data.refreshToken) : Promise.resolve(),
  ]);

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
  } catch (error) {
    if (error instanceof ApiClientError && ![400, 401, 403].includes(error.status)) {
      throw error;
    }
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
