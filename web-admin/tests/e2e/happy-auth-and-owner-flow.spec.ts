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

  test("public lead flows into owner dashboard via owner login", async ({ page }) => {
    await page.goto("/public/boarding-houses");
    await page.getByRole("link", { name: /Xem chi tiết và phòng/i }).first().click();

    const leadForm = page.locator("form").first();
    await leadForm.getByPlaceholder("Họ tên").fill("Khach Lead Playwright");
    await leadForm.getByPlaceholder("Số điện thoại").fill("0900111222");
    await leadForm.getByPlaceholder("Nội dung quan tâm").fill("Tôi cần xem phòng trong tuần này");
    await leadForm.getByRole("button", { name: /Gửi liên hệ/i }).click();

    await expect(page.getByText(/Đã gửi thông tin/i)).toBeVisible();

    await page.goto("/login/owner");
    await page.getByRole("button", { name: /owner demo/i }).click();

    await expect(page).toHaveURL(/\/owner\/dashboard$/);
    await expect(page.getByRole("heading", { name: /Tổng quan vận hành dãy trọ/i })).toBeVisible();

    await page.goto("/owner/boarding-houses/mock-bh-1/leads");
    await expect(page.getByText("Khach Lead Playwright")).toBeVisible();

    await page.goto("/owner/messages");
    await expect(page.locator("button").filter({ hasText: "Khach Lead Playwright" }).first()).toBeVisible();
  });

  test.skip("public booking flows into owner review, notification and audit log", async ({ page }) => {
    await page.goto("/public/boarding-houses");
    await page.getByRole("link", { name: /Xem chi tiết và phòng/i }).first().click();

    const bookingForm = page.locator("form").nth(1);
    await bookingForm.getByPlaceholder("Họ tên").fill("Khach Booking Playwright");
    await bookingForm.getByPlaceholder("Số điện thoại").fill("0900222333");
    await bookingForm.getByPlaceholder("Nội dung quan tâm").fill("Tôi muốn giữ phòng này ngay hôm nay");
    await bookingForm.getByRole("button", { name: /Gửi yêu cầu giữ chỗ/i }).click();

    await expect(page.getByText(/Đã gửi yêu cầu giữ chỗ/i)).toBeVisible();

    await page.goto("/login/owner");
    await page.getByRole("button", { name: /owner demo/i }).click();
    await expect(page).toHaveURL(/\/owner\/dashboard$/);

    await page.goto("/owner/bookings");
    await expect(page.getByText("Khach Booking Playwright")).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận" }).first().click();
    await expect(page.getByText("CONFIRMED")).toBeVisible();

    await page.goto("/owner/notifications");
    await expect(page.getByText(/Đã xác nhận booking/i)).toBeVisible();

    await page.goto("/owner/audit-logs");
    await expect(page.getByText(/booking.confirm/i)).toBeVisible();
  });
});
