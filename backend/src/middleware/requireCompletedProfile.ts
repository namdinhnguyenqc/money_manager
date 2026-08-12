import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { isOwnerRequireProfileFormEnabled } from "../lib/profileStore.js";

export const requireCompletedProfile = createMiddleware<AppEnv>(async (c, next) => {
  let user = c.get("user");
  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }

  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    await next();
    return;
  }

  const requireForm = await isOwnerRequireProfileFormEnabled();
  if (!requireForm) {
    // When platform admin disables profile form requirement, bypass profile gate check
    await next();
    return;
  }

  const { data: freshUser, error } = await supabaseAdmin
    .from("users")
    .select("id,status,is_profile_completed,onboarding_step")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to verify profile gate:", error.message);
  }

  if (freshUser) {
    user = {
      ...user,
      status: freshUser.status || user.status,
      isProfileCompleted: freshUser.is_profile_completed ?? user.isProfileCompleted,
      onboardingStep: freshUser.onboarding_step ?? user.onboardingStep,
    };
    c.set("user", user);
  }

  if (!user.isProfileCompleted || user.onboardingStep === "COMPLETE_PROFILE") {
    return c.json({
      error: "Profile required",
      code: "PROFILE_REQUIRED",
      message: "Vui lòng hoàn tất hồ sơ tài khoản trước khi sử dụng hệ thống.",
      nextStep: "COMPLETE_PROFILE",
    }, 403);
  }

  if (user.status === "REJECTED" || user.onboardingStep === "REJECTED") {
    return c.json({
      error: "Account rejected",
      code: "ACCOUNT_REJECTED",
      message: "Hồ sơ của bạn chưa được duyệt hoặc đã bị từ chối.",
      nextStep: "REJECTED",
    }, 403);
  }

  if (user.status === "PENDING_APPROVAL" || user.onboardingStep === "PENDING_APPROVAL") {
    return c.json({
      error: "Account pending approval",
      code: "ACCOUNT_PENDING_APPROVAL",
      message: "Hồ sơ của bạn đang chờ admin duyệt.",
      nextStep: "PENDING_APPROVAL",
    }, 403);
  }

  await next();
});
