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
  is_profile_completed?: boolean;
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
    return (res?.data?.user ?? res?.data ?? res) as OwnerProfile;
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
  const res = await apiPut<any>('/me/profile', input);
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
