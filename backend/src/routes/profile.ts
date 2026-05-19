import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { parseJson } from "../utils/validation.js";
import { buildProfileAuthMeta, findProfileByPhone, upsertUserProfile } from "../lib/profileStore.js";
import type { AppEnv } from "../types.js";

const profileRoutes = new Hono<AppEnv>();

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ tên"),
  phone: z.string().trim().regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ"),
  provinceCode: z.string().trim().min(1, "Vui lòng chọn tỉnh/thành phố"),
  provinceName: z.string().trim().min(1, "Vui lòng chọn tỉnh/thành phố"),
  districtCode: z.string().trim().min(1, "Vui lòng chọn quận/huyện"),
  districtName: z.string().trim().min(1, "Vui lòng chọn quận/huyện"),
  addressLine: z.string().trim().min(5, "Vui lòng nhập địa chỉ chi tiết"),
  avatarUrl: z.string().url().optional().nullable(),
});

const normalizePhone = (phone: string) => {
  const value = phone.trim();
  if (value.startsWith("+84")) return `0${value.slice(3)}`;
  return value;
};

const toProfilePayload = (data: z.infer<typeof profileSchema>) => ({
  ...data,
  phone: normalizePhone(data.phone),
});

const duplicatePhoneResponse = (c: any) => c.json({
  success: false,
  code: "DUPLICATE_PHONE",
  message: "Số điện thoại này đã được sử dụng bởi tài khoản khác.",
  details: {
    fieldErrors: {
      phone: ["Số điện thoại này đã được sử dụng bởi tài khoản khác."],
    },
  },
}, 409);

const ensureUniqueProfilePhone = async (c: any, userId: string, phone: string) => {
  const duplicate = await findProfileByPhone(phone, userId);
  if (duplicate) return duplicatePhoneResponse(c);
  return null;
};

const buildUserPayload = async (user: any) => {
  const meta = await buildProfileAuthMeta({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    status: user.status,
    provider: user.authProvider,
    is_profile_completed: user.isProfileCompleted,
    onboarding_step: user.onboardingStep,
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: meta.profile?.fullName || user.name || null,
      avatarUrl: meta.profile?.avatarUrl || user.avatar || null,
      role: user.role,
      authProvider: user.authProvider || "google",
      isProfileCompleted: meta.isProfileCompleted,
      onboardingStep: meta.onboardingStep,
    },
    profile: meta.profile,
  };
};

profileRoutes.use("*", requireAuth);

profileRoutes.get("/profile", async (c) => {
  const user = c.get("user");
  return c.json(await buildUserPayload(user));
});

profileRoutes.post("/profile/complete", async (c) => {
  const parsed = await parseJson(c, profileSchema);
  if (!parsed.ok) return parsed.response;

  const user = c.get("user");
  const payload = toProfilePayload(parsed.data);
  const duplicateResponse = await ensureUniqueProfilePhone(c, user.id, payload.phone);
  if (duplicateResponse) return duplicateResponse;

  const profile = await upsertUserProfile(user.id, payload);
  return c.json({
    success: true,
    message: "Profile completed successfully",
    user: {
      id: user.id,
      email: user.email,
      name: profile.fullName,
      avatarUrl: profile.avatarUrl ?? user.avatarUrl ?? null,
      role: user.role,
      authProvider: user.authProvider || "google",
      isProfileCompleted: true,
      onboardingStep: "DONE",
    },
    profile,
    nextStep: "DASHBOARD",
  });
});

profileRoutes.put("/profile", async (c) => {
  const parsed = await parseJson(c, profileSchema);
  if (!parsed.ok) return parsed.response;

  const user = c.get("user");
  const payload = toProfilePayload(parsed.data);
  const duplicateResponse = await ensureUniqueProfilePhone(c, user.id, payload.phone);
  if (duplicateResponse) return duplicateResponse;

  const profile = await upsertUserProfile(user.id, payload);
  return c.json({
    success: true,
    message: "Profile updated successfully",
    user: {
      id: user.id,
      email: user.email,
      name: profile.fullName,
      avatarUrl: profile.avatarUrl ?? user.avatarUrl ?? null,
      role: user.role,
      authProvider: user.authProvider || "google",
      isProfileCompleted: true,
      onboardingStep: "DONE",
    },
    profile,
  });
});

export default profileRoutes;
