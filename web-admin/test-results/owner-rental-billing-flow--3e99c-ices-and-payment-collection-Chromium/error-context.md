# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: owner-rental-billing-flow.spec.ts >> Owner rental billing flow >> phase 1 flow separates rooms, invoices and payment collection
- Location: tests/e2e/owner-rental-billing-flow.spec.ts:34:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Cơ sở của tôi/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: /Cơ sở của tôi/i })

```

# Page snapshot

```yaml
- generic [ref=e2]: Đang xác thực quyền truy cập owner...
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | 
  3   | async function loginOwner(page: any, request: any) {
  4   |   const response = await request.post("http://localhost:8787/auth/owner-google", {
  5   |     data: { idToken: "mock-owner-google-token" },
  6   |   });
  7   |   const data = await response.json();
  8   |   await page.goto("/");
  9   |   await page.evaluate((session) => {
  10  |     window.localStorage.setItem("accessToken", session.accessToken);
  11  |     window.localStorage.setItem("userRole", session.user.role);
  12  |     document.cookie = `accessToken=${session.accessToken}; path=/; max-age=604800; samesite=lax`;
  13  |     document.cookie = `userRole=${session.user.role}; path=/; max-age=604800; samesite=lax`;
  14  |   }, data);
  15  |   await page.route("**/auth/me", (route: any) => {
  16  |     route.fulfill({
  17  |       status: 200,
  18  |       contentType: "application/json",
  19  |       headers: {
  20  |         "access-control-allow-origin": "*",
  21  |         "access-control-allow-headers": "authorization,content-type",
  22  |         "access-control-allow-methods": "GET,OPTIONS",
  23  |       },
  24  |       body: JSON.stringify(data.user),
  25  |     });
  26  |   });
  27  | }
  28  | 
  29  | test.describe("Owner rental billing flow", () => {
  30  |   test.beforeEach(async ({ request }) => {
  31  |     await request.post("http://localhost:8787/dev/reset-mock");
  32  |   });
  33  | 
  34  |   test("phase 1 flow separates rooms, invoices and payment collection", async ({ page, request }) => {
  35  |     await loginOwner(page, request);
  36  | 
  37  |     await page.goto("/facilities");
> 38  |     await expect(page.getByRole("heading", { name: /Cơ sở của tôi/i })).toBeVisible();
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  39  |     await page.getByRole("link", { name: /Mock Boarding House/i }).click();
  40  |     await expect(page.getByRole("heading", { name: /Mock Boarding House/i })).toBeVisible();
  41  | 
  42  |     await page.getByRole("button", { name: /Thêm phòng/i }).click();
  43  |     await page.getByLabel("Số phòng *").fill("Phòng 204");
  44  |     await page.getByLabel("Giá thuê/tháng").fill("4200000");
  45  |     await page.getByRole("button", { name: /^Tạo phòng$/i }).click();
  46  |     await expect(page.getByText("Phòng 204")).toBeVisible();
  47  | 
  48  |     await page.getByText("Phòng 204").click();
  49  |     await page.getByRole("link", { name: /Tạo hợp đồng/i }).click();
  50  |     await expect(page).toHaveURL(/\/contracts\/new\?room_id=\d+&facility_id=mock-bh-1/);
  51  |     await expect(page.getByRole("heading", { name: /Tạo hợp đồng/i })).toBeVisible();
  52  |     await page.getByLabel("Họ tên *").fill("Lê Văn C");
  53  |     await page.getByLabel("SĐT *").fill("0912345678");
  54  |     await page.getByLabel("CCCD *").fill("123456789012");
  55  |     await page.getByRole("button", { name: /Tiếp theo/i }).click();
  56  |     await page.getByLabel(/Ngày kết thúc/).fill("2026-12-31");
  57  |     await page.getByRole("button", { name: /^Tạo hợp đồng$/i }).click();
  58  | 
  59  |     await expect(page).toHaveURL(/\/contracts\/\d+$/);
  60  |     await expect(page.getByRole("heading", { name: /Hợp đồng #/i })).toBeVisible();
  61  |     await page.getByRole("link", { name: /Tạo hóa đơn tháng này/i }).click();
  62  |     await expect(page).toHaveURL(/\/invoices\/new\?contract_id=\d+/);
  63  |     await expect(page.getByRole("heading", { name: /Tạo hóa đơn/i })).toBeVisible();
  64  |     await page.getByLabel("Chỉ số cuối").first().fill("10");
  65  |     await page.getByLabel("Chỉ số cuối").nth(1).fill("2");
  66  |     await page.getByRole("button", { name: /Tạo và gửi luôn/i }).click();
  67  | 
  68  |     await expect(page).toHaveURL(/\/invoices\/\d+$/);
  69  |     await expect(page.getByRole("heading", { name: /Hóa đơn #/i })).toBeVisible();
  70  |     await page.getByRole("link", { name: /Ghi nhận thanh toán/i }).click();
  71  |     await expect(page).toHaveURL(/\/payments\/new\?invoice_id=\d+/);
  72  |     await expect(page.getByRole("heading", { name: /Ghi nhận thu tiền/i })).toBeVisible();
  73  |     await page.getByRole("button", { name: /Xác nhận thu tiền/i }).click();
  74  |     await expect(page).toHaveURL(/\/invoices\/\d+$/);
  75  |     await expect(page.getByText(/Đã thu:/i)).toBeVisible();
  76  | 
  77  |     await page.goto("/payments");
  78  |     await expect(page.getByRole("heading", { name: /^Thu tiền$/i })).toBeVisible();
  79  |     await expect(page.getByText(/Phòng 204/i)).toBeVisible();
  80  |   });
  81  | 
  82  |   test("regression: contract form blocks invalid tenant identity without runtime crash", async ({ page, request }) => {
  83  |     await loginOwner(page, request);
  84  | 
  85  |     await page.goto("/facilities/mock-bh-1");
  86  |     await page.getByRole("button", { name: /Thêm phòng/i }).click();
  87  |     await page.getByLabel("Số phòng *").fill("Phòng 205");
  88  |     await page.getByLabel("Giá thuê/tháng").fill("4300000");
  89  |     await page.getByRole("button", { name: /^Tạo phòng$/i }).click();
  90  |     await expect(page.getByText("Phòng 205")).toBeVisible();
  91  | 
  92  |     await page.getByText("Phòng 205").click();
  93  |     await page.getByRole("link", { name: /Tạo hợp đồng/i }).click();
  94  |     await page.getByLabel("Họ tên *").fill("Khách A");
  95  |     await page.getByLabel("SĐT *").fill("abc1xyz");
  96  |     await expect(page.getByLabel("SĐT *")).toHaveValue("1");
  97  |     await page.getByLabel("CCCD *").fill("abc123456789xyz");
  98  |     await expect(page.getByLabel("CCCD *")).toHaveValue("123456789");
  99  |     await page.getByLabel("Email").fill("0927368772@gmail.com");
  100 |     await page.getByRole("button", { name: /Tiếp theo/i }).click();
  101 | 
  102 |     await expect(page.getByText("Số điện thoại phải có đúng 10 số.")).toBeVisible();
  103 |     await expect(page.getByText("CCCD phải có đúng 12 số.")).toBeVisible();
  104 |     await expect(page).toHaveURL(/\/contracts\/new/);
  105 |   });
  106 | });
  107 | 
```