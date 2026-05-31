/**
 * TrọCare Tenant Mobile — Auth Service
 */

import { Platform } from 'react-native';
import {
  apiPost,
  apiGet,
  apiDelete,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
} from './api';

export type UserRole = 'TENANT';

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  status: string;
  authProvider: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Login via phone and password.
 */
export async function loginWithPhone(phone: string, password: string): Promise<LoginResponse> {
  const res = await apiPost<any>('/tenant-auth/login', { phone, password });
  const data = res?.data ?? res;

  // Persist tokens in SecureStore
  if (data.accessToken) await setAccessToken(data.accessToken);
  if (data.refreshToken) await setRefreshToken(data.refreshToken);

  return data as LoginResponse;
}

/**
 * Register via invite code, phone and password.
 */
export async function registerWithInvite(
  phone: string,
  password: string,
  name: string,
  inviteCode: string
): Promise<LoginResponse> {
  const res = await apiPost<any>('/tenant-auth/register', {
    phone,
    password,
    name,
    invite_code: inviteCode,
  });
  const data = res?.data ?? res;

  // Persist tokens
  if (data.accessToken) await setAccessToken(data.accessToken);
  if (data.refreshToken) await setRefreshToken(data.refreshToken);

  return data as LoginResponse;
}

/**
 * Validate invite code.
 */
export async function validateInviteCode(code: string): Promise<{ valid: boolean; tenantName?: string; message?: string }> {
  try {
    const res = await apiGet<any>(`/tenant-auth/invite/${code}`);
    return res?.data ?? res;
  } catch (err: any) {
    return { valid: false, message: err.message || 'Lỗi kiểm tra mã mời' };
  }
}

/**
 * Check current authentication status.
 */
export async function checkAuthStatus(): Promise<AuthUser | null> {
  try {
    // Fetch profile
    const res = await apiGet<any>('/tenant/me');
    const data = res?.data ?? res;
    if (!data) return null;

    return {
      id: data.userId,
      email: `tenant_${data.phone}@trocare.local`,
      phone: data.phone,
      name: data.name,
      role: 'TENANT',
      status: 'ACTIVE',
      authProvider: 'PHONE',
    };
  } catch {
    return null;
  }
}

/**
 * Logout — clears tokens and deregisters FCM on backend.
 */
export async function logoutTenant(fcmToken?: string): Promise<void> {
  try {
    if (fcmToken) {
      await apiDelete<any>('/tenant/fcm/unregister');
    }
  } catch {
    // Silently ignore server unregister errors to guarantee local logout
  } finally {
    await clearTokens();
  }
}

/**
 * Request forgot password.
 */
export async function forgotPassword(phone: string, email: string): Promise<{ success: boolean; message: string }> {
  const res = await apiPost<any>('/tenant-auth/forgot-password', { phone, email });
  const data = res?.data ?? res;
  return data;
}

/**
 * Change account password.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const res = await apiPost<any>('/tenant-auth/change-password', { currentPassword, newPassword });
  const data = res?.data ?? res;
  return data;
}

