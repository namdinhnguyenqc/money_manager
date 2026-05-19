import { env } from "../config/env.js";

import { supabaseAdmin } from "./supabase.js";

export type OnboardingStep = "COMPLETE_PROFILE" | "DONE";

export type UserProfileInput = {
  fullName: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  addressLine: string;
  avatarUrl?: string | null;
};

export type UserProfileResponse = UserProfileInput & {
  fullAddress: string;
};

export const provinces = [
  { code: "79", name: "TP. Hồ Chí Minh" },
  { code: "01", name: "Hà Nội" },
  { code: "48", name: "Đà Nẵng" },
  { code: "92", name: "Cần Thơ" },
];

export const districts = [
  { code: "760", name: "Quận 1", provinceCode: "79" },
  { code: "769", name: "Thành phố Thủ Đức", provinceCode: "79" },
  { code: "770", name: "Quận 3", provinceCode: "79" },
  { code: "001", name: "Ba Đình", provinceCode: "01" },
  { code: "002", name: "Hoàn Kiếm", provinceCode: "01" },
  { code: "490", name: "Hải Châu", provinceCode: "48" },
  { code: "491", name: "Thanh Khê", provinceCode: "48" },
  { code: "916", name: "Ninh Kiều", provinceCode: "92" },
];

const toProfileResponse = (profile: any): UserProfileResponse => ({
  fullName: profile.full_name,
  phone: profile.phone,
  provinceCode: profile.province_code,
  provinceName: profile.province_name,
  districtCode: profile.district_code,
  districtName: profile.district_name,
  addressLine: profile.address_line,
  fullAddress: profile.full_address,
  avatarUrl: profile.avatar_url ?? null,
});

export const buildFullAddress = (input: Pick<UserProfileInput, "addressLine" | "districtName" | "provinceName">) =>
  [input.addressLine, input.districtName, input.provinceName].filter(Boolean).join(", ");

export async function getUserProfile(userId: string): Promise<UserProfileResponse | null> {


  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user profile:", error);
    return null;
  }

  return data ? toProfileResponse(data) : null;
}

export async function upsertUserProfile(userId: string, input: UserProfileInput): Promise<UserProfileResponse> {
  const now = new Date().toISOString();
  const fullAddress = buildFullAddress(input);



  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert({
      user_id: userId,
      full_name: input.fullName,
      phone: input.phone,
      province_code: input.provinceCode,
      province_name: input.provinceName,
      district_code: input.districtCode,
      district_name: input.districtName,
      address_line: input.addressLine,
      full_address: fullAddress,
      avatar_url: input.avatarUrl ?? null,
      updated_at: now,
    }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to upsert user profile:", error);
    throw new Error("PROFILE_UPSERT_FAILED");
  }

  const userUpdatePayload: any = {
    name: input.fullName,
    avatar: input.avatarUrl ?? undefined,
    is_profile_completed: true,
    onboarding_step: "DONE",
  };

  const { error: userUpdateError } = await supabaseAdmin
    .from("users")
    .update(userUpdatePayload)
    .eq("id", userId);

  if (userUpdateError) {
    console.error("Failed to update user profile status in users table:", userUpdateError.message);
    // If it's a "column does not exist" error, try updating only the basic fields
    if (userUpdateError.code === "42703") {
      await supabaseAdmin
        .from("users")
        .update({
          name: input.fullName,
          avatar: input.avatarUrl ?? undefined,
        })
        .eq("id", userId);
    }
  }

  return toProfileResponse(data);
}

export async function findProfileByPhone(phone: string, exceptUserId?: string): Promise<UserProfileResponse | null> {


  let query = supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("phone", phone)
    .limit(1);

  if (exceptUserId) {
    query = query.neq("user_id", exceptUserId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("Failed to check duplicate profile phone:", error);
    throw new Error("PROFILE_DUPLICATE_CHECK_FAILED");
  }

  return data ? toProfileResponse(data) : null;
}

export async function isUserProfileCompleted(userId: string, explicit?: boolean | null): Promise<boolean> {
  if (explicit === true) return true;
  const profile = await getUserProfile(userId);
  return Boolean(profile);
}

export async function buildProfileAuthMeta(user: any) {
  const profile = await getUserProfile(user.id);
  const isProfileCompleted = Boolean(profile || user.is_profile_completed === true || user.onboarding_step === "DONE");
  const onboardingStep: OnboardingStep = isProfileCompleted ? "DONE" : "COMPLETE_PROFILE";

  return {
    profile,
    isProfileCompleted,
    onboardingStep,
    nextStep: onboardingStep === "DONE" ? "DASHBOARD" : "COMPLETE_PROFILE",
  };
}
