import { expect, test } from "@playwright/test";

test.describe("Happy auth and owner flow", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("http://localhost:8787/dev/reset-mock");
  });

  test("private routes redirect to the correct login entrypoint", async ({ page }) => {
    await page.goto("/owner/dashboard");
    await expect(page).toHaveURL(/\/login\/owner$/);

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login\/admin$/);
  });

  test("admin can login from dedicated admin route", async ({ page }) => {
    await page.goto("/login/admin");

    await page.getByLabel("Tên đăng nhập").fill("admin");
    await page.getByLabel("Mật khẩu").fill("admin");
    await page.getByRole("button", { name: /Vào admin/i }).click();

    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Người dùng", exact: true })).toBeVisible();
  });

});
