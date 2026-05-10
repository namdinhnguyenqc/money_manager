import { expect, test } from "@playwright/test";

async function loginOwner(page: any) {
  await page.goto("/login/owner");
  await page.getByRole("button", { name: /owner demo/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard$/);
}

test.describe("Owner legacy modules", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("http://localhost:8787/dev/reset-mock");
  });

  test("owner can use restored legacy finance, trading, settings and rental pages", async ({ page }) => {
    await loginOwner(page);

    await page.goto("/owner/transactions");
    await expect(page.getByRole("heading", { name: /Giao dịch/i })).toBeVisible();
    await page.getByRole("button", { name: /Thêm giao dịch/i }).click();
    await expect(page.getByRole("heading", { name: "Thêm Giao Dịch" })).toBeVisible();
    await page.locator('label:has-text("Số Tiền") + input').fill("123000");
    await page.locator('label:has-text("Chi tiết khoản chi/thu") + input').fill("Integration Tx");
    await page.getByRole("button", { name: /Lưu Giao Dịch/i }).click();
    await expect(page.getByText("Integration Tx")).toBeVisible();

    await page.goto("/owner/trading");
    await expect(page.getByRole("heading", { name: /Kinh doanh/i })).toBeVisible();
    await page.getByRole("button", { name: "Nhập Hàng", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nhập Lô Hàng Mới" })).toBeVisible();
    await page.locator('label:has-text("Tên kiện hàng/Sản phẩm") + input').fill("Lo hang test");
    await page.locator('label:has-text("TỔNG VỐN NHẬP") + input').fill("500000");
    await page.getByRole("button", { name: /Nhập Hàng \(Trừ tiền vốn\)/i }).click();
    await expect(page.getByText(/Lo hang test/i)).toBeVisible();

    await page.goto("/owner/settings");
    await expect(page.getByRole("heading", { name: /Thiết lập/i })).toBeVisible();
    await page.locator('label:has-text("Số tài khoản") + input').fill("0123456789");
    await page.locator('label:has-text("Tên chủ tài khoản") + input').fill("TEST OWNER");
    await page.getByRole("button", { name: /Lưu cấu hình/i }).click();
    await expect(page.getByText(/Đã lưu cấu hình thanh toán/i)).toBeVisible();

    await page.goto("/owner/rental");
    await expect(page.getByRole("heading", { name: /Quản lý hợp đồng thuê/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Tạo hợp đồng/i })).toBeVisible();
  });
});
