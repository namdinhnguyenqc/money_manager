import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";

export const requireCompletedProfile = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }

  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    await next();
    return;
  }

  if (!user.isProfileCompleted || user.onboardingStep === "COMPLETE_PROFILE") {
    return c.json({
      error: "Profile required",
      code: "PROFILE_REQUIRED",
      message: "Vui lòng hoàn tất hồ sơ tài khoản trước khi sử dụng hệ thống.",
      nextStep: "COMPLETE_PROFILE",
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
