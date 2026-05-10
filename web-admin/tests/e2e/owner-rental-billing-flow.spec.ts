import { expect, test } from "@playwright/test";

async function loginOwner(page: any, request: any) {
  const response = await request.post("http://localhost:8787/auth/owner-google", {
    data: { idToken: "mock-owner-google-token" },
  });
  const data = await response.json();
  await page.goto("/");
  await page.evaluate((session: any) => {
    window.localStorage.setItem("accessToken", session.accessToken);
    window.localStorage.setItem("userRole", session.user.role);
    document.cookie = `accessToken=${session.accessToken}; path=/; max-age=604800; samesite=lax`;
    document.cookie = `userRole=${session.user.role}; path=/; max-age=604800; samesite=lax`;
  }, data);
  await page.route("**/auth/me", (route: any) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization,content-type",
        "access-control-allow-methods": "GET,OPTIONS",
      },
      body: JSON.stringify(data.user),
    });
  });
}

test.describe("Owner rental billing flow", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("http://localhost:8787/dev/reset-mock");
  });

  test("phase 1 flow separates rooms, invoices and payment collection", async ({ page, request }) => {
    await loginOwner(page, request);

    await page.goto("/facilities");
    await expect(page.getByRole("heading", { name: /Cơ sở của tôi/i })).toBeVisible();
    await page.getByRole("link", { name: /Mock Boarding House/i }).click();
    await expect(page.getByRole("heading", { name: /Mock Boarding House/i })).toBeVisible();

    await page.getByRole("button", { name: /Thêm phòng/i }).click();
    await page.getByLabel("Số phòng *").fill("Phòng 204");
    await page.getByLabel("Giá thuê/tháng").fill("4200000");
    await page.getByRole("button", { name: /^Tạo phòng$/i }).click();
    await expect(page.getByText("Phòng 204")).toBeVisible();

    await page.getByText("Phòng 204").click();
    await page.getByRole("link", { name: /Tạo hợp đồng/i }).click();
    await expect(page).toHaveURL(/\/contracts\/new\?room_id=\d+&facility_id=mock-bh-1/);
    await expect(page.getByRole("heading", { name: /Tạo hợp đồng/i })).toBeVisible();
    await page.getByLabel("Họ tên *").fill("Lê Văn C");
    await page.getByLabel("SĐT *").fill("0912345678");
    await page.getByLabel("CCCD *").fill("123456789012");
    await page.getByRole("button", { name: /Tiếp theo/i }).click();
    await page.getByLabel(/Ngày kết thúc/).fill("2026-12-31");
    await page.getByRole("button", { name: /^Tạo hợp đồng$/i }).click();

    await expect(page).toHaveURL(/\/contracts\/\d+$/);
    await expect(page.getByRole("heading", { name: /Hợp đồng #/i })).toBeVisible();
    await page.getByRole("link", { name: /Tạo hóa đơn tháng này/i }).click();
    await expect(page).toHaveURL(/\/invoices\/new\?contract_id=\d+/);
    await expect(page.getByRole("heading", { name: /Tạo hóa đơn/i })).toBeVisible();
    await page.getByLabel("Chỉ số cuối").first().fill("10");
    await page.getByLabel("Chỉ số cuối").nth(1).fill("2");
    await page.getByRole("button", { name: /Tạo và gửi luôn/i }).click();

    await expect(page).toHaveURL(/\/invoices\/\d+$/);
    await expect(page.getByRole("heading", { name: /Hóa đơn #/i })).toBeVisible();
    await page.getByRole("link", { name: /Ghi nhận thanh toán/i }).click();
    await expect(page).toHaveURL(/\/payments\/new\?invoice_id=\d+/);
    await expect(page.getByRole("heading", { name: /Ghi nhận thu tiền/i })).toBeVisible();
    await page.getByRole("button", { name: /Xác nhận thu tiền/i }).click();
    await expect(page).toHaveURL(/\/invoices\/\d+$/);
    await expect(page.getByText(/Đã thu:/i)).toBeVisible();

    await page.goto("/payments");
    await expect(page.getByRole("heading", { name: /^Thu tiền$/i })).toBeVisible();
    await expect(page.getByText(/Phòng 204/i)).toBeVisible();
  });

  test("regression: contract form blocks invalid tenant identity without runtime crash", async ({ page, request }) => {
    await loginOwner(page, request);

    await page.goto("/facilities/mock-bh-1");
    await page.getByRole("button", { name: /Thêm phòng/i }).click();
    await page.getByLabel("Số phòng *").fill("Phòng 205");
    await page.getByLabel("Giá thuê/tháng").fill("4300000");
    await page.getByRole("button", { name: /^Tạo phòng$/i }).click();
    await expect(page.getByText("Phòng 205")).toBeVisible();

    await page.getByText("Phòng 205").click();
    await page.getByRole("link", { name: /Tạo hợp đồng/i }).click();
    await page.getByLabel("Họ tên *").fill("Khách A");
    await page.getByLabel("SĐT *").fill("abc1xyz");
    await expect(page.getByLabel("SĐT *")).toHaveValue("1");
    await page.getByLabel("CCCD *").fill("abc123456789xyz");
    await expect(page.getByLabel("CCCD *")).toHaveValue("123456789");
    await page.getByLabel("Email").fill("0927368772@gmail.com");
    await page.getByRole("button", { name: /Tiếp theo/i }).click();

    await expect(page.getByText("Số điện thoại phải có đúng 10 số.")).toBeVisible();
    await expect(page.getByText("CCCD phải có đúng 12 số.")).toBeVisible();
    await expect(page).toHaveURL(/\/contracts\/new/);
  });
});
