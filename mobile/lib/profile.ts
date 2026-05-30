/**
 * TrọCare Mobile — Profile API Helpers
 * Ported from web-admin/src/lib/profile.ts
 */

import { apiGet, apiPost, apiPut } from './api';

export interface OwnerProfile {
  id?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  idCard?: string;
  address?: string;
  addressLine?: string;
  provinceCode?: string;
  provinceName?: string;
  districtCode?: string;
  districtName?: string;
  avatar?: string;
  avatarUrl?: string;
  is_profile_completed?: boolean;
  isProfileCompleted?: boolean;
}

function normalizeProfileResponse(res: any): OwnerProfile | null {
  const payload = res?.data ?? res;
  if (!payload) return null;

  const user = payload.user ?? {};
  const profile = payload.profile ?? payload;

  return {
    ...profile,
    id: profile.id ?? user.id,
    email: user.email ?? profile.email,
    fullName: profile.fullName ?? user.name ?? user.fullName ?? '',
    phone: profile.phone ?? user.phone ?? '',
    address: profile.address ?? profile.addressLine ?? '',
    addressLine: profile.addressLine ?? profile.address ?? '',
    avatar: profile.avatar ?? profile.avatarUrl ?? user.avatarUrl ?? user.avatar ?? '',
    avatarUrl: profile.avatarUrl ?? profile.avatar ?? user.avatarUrl ?? user.avatar ?? '',
    is_profile_completed: profile.is_profile_completed ?? user.is_profile_completed ?? user.isProfileCompleted,
    isProfileCompleted: profile.isProfileCompleted ?? user.isProfileCompleted ?? user.is_profile_completed,
  } as OwnerProfile;
}

export interface Province {
  code: string;
  name: string;
}

export interface District {
  code: string;
  name: string;
}

/** Fetch current user profile */
export async function loadProfile(): Promise<OwnerProfile | null> {
  try {
    const res = await apiGet<any>('/me/profile');
    return normalizeProfileResponse(res);
  } catch {
    return null;
  }
}

/** Complete onboarding profile */
export async function completeProfile(input: {
  fullName: string;
  phone: string;
  idCard: string;
  address?: string;
  addressLine?: string;
  provinceCode?: string;
  provinceName?: string;
  districtCode?: string;
  districtName?: string;
}): Promise<any> {
  const res = await apiPost<any>('/me/profile/complete', input);
  return res?.data ?? res;
}

/** Update existing profile (email is readonly) */
export async function updateProfile(input: Partial<OwnerProfile>): Promise<any> {
  const res = await apiPut<any>('/me/profile', {
    ...input,
    addressLine: input.addressLine ?? input.address,
  });
  return res?.data ?? res;
}

/** Load Vietnamese provinces */
export async function loadProvinces(): Promise<Province[]> {
  const res = await apiGet<any>('/locations/provinces');
  return (res?.data ?? []) as Province[];
}

/** Load districts by province code */
export async function loadDistricts(provinceCode: string): Promise<District[]> {
  const res = await apiGet<any>(`/locations/districts?provinceCode=${provinceCode}`);
  return (res?.data ?? []) as District[];
}
