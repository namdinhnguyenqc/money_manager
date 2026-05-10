"use client";

import { apiGet, apiPost, apiPut } from "@/utils/apiClient";

export type OnboardingStep = "COMPLETE_PROFILE" | "DONE";

export type UserProfile = {
  fullName: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  addressLine: string;
  fullAddress: string;
  avatarUrl?: string | null;
};

export type ProfileUser = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  role: string;
  authProvider?: string | null;
  isProfileCompleted: boolean;
  onboardingStep: OnboardingStep;
};

export type ProfileResponse = {
  success: boolean;
  user: ProfileUser;
  profile: UserProfile | null;
  nextStep?: "COMPLETE_PROFILE" | "DASHBOARD";
};

export type LocationItem = {
  code: string;
  name: string;
  provinceCode?: string;
};

export type ProfileFormValues = {
  fullName: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  addressLine: string;
  avatarUrl?: string | null;
};

export type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>;

export const emptyProfileForm: ProfileFormValues = {
  fullName: "",
  phone: "",
  provinceCode: "",
  provinceName: "",
  districtCode: "",
  districtName: "",
  addressLine: "",
  avatarUrl: null,
};

export function validateProfileForm(values: ProfileFormValues): ProfileFormErrors {
  const errors: ProfileFormErrors = {};
  const phone = values.phone.trim();

  if (values.fullName.trim().length < 2) errors.fullName = "Vui lòng nhập họ tên";
  if (!/^(0|\+84)\d{9,10}$/.test(phone)) errors.phone = "Vui lòng nhập số điện thoại hợp lệ";
  if (!values.provinceCode) errors.provinceCode = "Vui lòng chọn tỉnh/thành phố";
  if (!values.districtCode) errors.districtCode = "Vui lòng chọn quận/huyện";
  if (values.addressLine.trim().length < 5) errors.addressLine = "Vui lòng nhập địa chỉ chi tiết";

  return errors;
}

export const hasProfileErrors = (errors: ProfileFormErrors) => Object.keys(errors).length > 0;

export const profileToForm = (profile: UserProfile | null, user?: ProfileUser | null): ProfileFormValues => ({
  ...emptyProfileForm,
  fullName: profile?.fullName || user?.name || "",
  phone: profile?.phone || "",
  provinceCode: profile?.provinceCode || "",
  provinceName: profile?.provinceName || "",
  districtCode: profile?.districtCode || "",
  districtName: profile?.districtName || "",
  addressLine: profile?.addressLine || "",
  avatarUrl: profile?.avatarUrl || user?.avatarUrl || null,
});

export async function getMyProfile() {
  return apiGet<ProfileResponse>("/me/profile");
}

export async function completeProfile(values: ProfileFormValues) {
  const { avatarUrl: _avatarUrl, ...payload } = values;
  return apiPost<ProfileResponse>("/me/profile/complete", payload);
}

export async function updateProfile(values: ProfileFormValues) {
  return apiPut<ProfileResponse>("/me/profile", values);
}

export async function getProvinces() {
  const res = await apiGet<{ success: boolean; data: LocationItem[] }>("/locations/provinces");
  return res.data || [];
}

export async function getDistricts(provinceCode: string) {
  if (!provinceCode) return [];
  const res = await apiGet<{ success: boolean; data: LocationItem[] }>(`/locations/districts?provinceCode=${encodeURIComponent(provinceCode)}`);
  return res.data || [];
}
