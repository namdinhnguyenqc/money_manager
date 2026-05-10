import { expect, test } from "@playwright/test";

async function setOwnerSession(page: any, auth: any) {
  await page.goto("/");
  await page.evaluate((session: any) => {
    window.localStorage.setItem("accessToken", session.accessToken);
    window.localStorage.setItem("userRole", session.user.role);
    window.localStorage.setItem("userEmail", session.user.email);
    window.localStorage.setItem("userName", session.user.name || "");
    window.localStorage.setItem("isProfileCompleted", String(session.user.isProfileCompleted));
    window.localStorage.setItem("onboardingStep", session.user.onboardingStep || "");
    document.cookie = `accessToken=${session.accessToken}; path=/; max-age=604800; samesite=lax`;
    document.cookie = `userRole=${session.user.role}; path=/; max-age=604800; samesite=lax`;
    document.cookie = `isProfileCompleted=${session.user.isProfileCompleted}; path=/; max-age=604800; samesite=lax`;
  }, auth);
}

test.describe("Owner profile onboarding", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("http://localhost:8787/dev/reset-mock");
  });

  test("new Google owner must complete profile before owner workspace", async ({ page, request }) => {
    const loginResponse = await request.post("http://localhost:8787/auth/owner-google", {
      data: { idToken: "mock-new-owner-google-token" },
    });
    const auth = await loginResponse.json();
    expect(auth.nextStep).toBe("COMPLETE_PROFILE");

    await setOwnerSession(page, auth);
    await page.goto("/owner/dashboard");
    await expect(page).toHaveURL(/\/complete-profile/);
    await expect(page.getByRole("heading", { name: /Hoàn tất hồ sơ/i })).toBeVisible();
    await expect(page.getByLabel(/Email đã xác thực/i)).toBeDisabled();

    await page.getByLabel(/Họ và tên/i).fill("Nguyễn Văn Test");
    await page.getByLabel(/Số điện thoại/i).fill("0901234567");
    await page.getByLabel(/Tỉnh \/ Thành phố/i).selectOption("79");
    await page.getByLabel(/Quận \/ Huyện/i).selectOption("760");
    await page.getByLabel(/Địa chỉ chi tiết/i).fill("123 Nguyễn Huệ");
    await page.getByRole("button", { name: /^Hoàn tất$/i }).click();

    await expect(page).toHaveURL(/\/owner/);
    await page.goto("/owner/profile");
    await expect(page.getByRole("heading", { name: /Hồ sơ cá nhân/i })).toBeVisible();
    await expect(page.getByRole("main").getByText("Nguyễn Văn Test").first()).toBeVisible();
    await expect(page.getByRole("main").getByText("new-owner@example.com").first()).toBeVisible();

    await page.getByRole("link", { name: /Chỉnh sửa hồ sơ/i }).click();
    await expect(page.getByRole("heading", { name: /Cài đặt hồ sơ/i })).toBeVisible();
    await expect(page.getByLabel(/Email đã xác thực/i)).toBeDisabled();
    await page.getByLabel(/Số điện thoại/i).fill("0909999999");
    await page.getByRole("button", { name: /Lưu thay đổi/i }).click();
    await expect(page.getByText("Cập nhật hồ sơ thành công")).toBeVisible();
  });
});
