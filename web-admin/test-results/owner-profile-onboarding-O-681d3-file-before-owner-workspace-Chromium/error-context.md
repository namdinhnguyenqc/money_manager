# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: owner-profile-onboarding.spec.ts >> Owner profile onboarding >> new Google owner must complete profile before owner workspace
- Location: tests/e2e/owner-profile-onboarding.spec.ts:23:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/complete-profile/
Received string:  "http://localhost:3001/owner/dashboard"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    9 × unexpected value "http://localhost:3001/owner/dashboard"

```

# Page snapshot

```yaml
- generic [active]:
  - alert [ref=e1]
  - dialog "Server Error" [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - navigation [ref=e8]:
          - button "previous" [disabled] [ref=e9]:
            - img "previous" [ref=e10]
          - button "next" [disabled] [ref=e12]:
            - img "next" [ref=e13]
          - generic [ref=e15]: 1 of 1 error
          - generic [ref=e16]:
            - text: Next.js (14.2.35) is outdated
            - link "(learn more)" [ref=e18] [cursor=pointer]:
              - /url: https://nextjs.org/docs/messages/version-staleness
        - heading "Server Error" [level=1] [ref=e19]
        - paragraph [ref=e20]: "Error: Cannot find module './9276.js' Require stack: - /Users/thao/money_manager/web-admin/.next/server/webpack-runtime.js - /Users/thao/money_manager/web-admin/.next/server/app/owner/dashboard/page.js - /Users/thao/money_manager/web-admin/node_modules/next/dist/server/require.js - /Users/thao/money_manager/web-admin/node_modules/next/dist/server/load-components.js - /Users/thao/money_manager/web-admin/node_modules/next/dist/build/utils.js - /Users/thao/money_manager/web-admin/node_modules/next/dist/server/dev/hot-middleware.js - /Users/thao/money_manager/web-admin/node_modules/next/dist/server/dev/hot-reloader-webpack.js - /Users/thao/money_manager/web-admin/node_modules/next/dist/server/lib/router-utils/setup-dev-bundler.js - /Users/thao/money_manager/web-admin/node_modules/next/dist/server/lib/router-server.js - /Users/thao/money_manager/web-admin/node_modules/next/dist/server/lib/start-server.js"
        - generic [ref=e21]: This error happened while generating the page. Any console logs will be displayed in the terminal window.
      - generic [ref=e22]:
        - heading "Call Stack" [level=2] [ref=e23]
        - group [ref=e24]:
          - generic "Next.js" [ref=e25] [cursor=pointer]:
            - img [ref=e26]
            - img [ref=e28]
            - text: Next.js
        - generic [ref=e33]:
          - heading "Array.reduce" [level=3] [ref=e34]
          - generic [ref=e36]: <anonymous>
        - group [ref=e37]:
          - generic "Next.js" [ref=e38] [cursor=pointer]:
            - img [ref=e39]
            - img [ref=e41]
            - text: Next.js
        - generic [ref=e46]:
          - heading "Array.map" [level=3] [ref=e47]
          - generic [ref=e49]: <anonymous>
        - group [ref=e50]:
          - generic "Next.js" [ref=e51] [cursor=pointer]:
            - img [ref=e52]
            - img [ref=e54]
            - text: Next.js
        - generic [ref=e59]:
          - heading "<unknown>" [level=3] [ref=e60]
          - generic [ref=e62]: file:///Users/thao/money_manager/web-admin/.next/server/app/owner/dashboard/page.js (1:13269)
        - generic [ref=e63]:
          - heading "Object.<anonymous>" [level=3] [ref=e64]
          - generic [ref=e66]: file:///Users/thao/money_manager/web-admin/.next/server/app/owner/dashboard/page.js (1:13326)
        - group [ref=e67]:
          - generic "Next.js" [ref=e68] [cursor=pointer]:
            - img [ref=e69]
            - img [ref=e71]
            - text: Next.js
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | async function setOwnerSession(page: any, auth: any) {
  4  |   await page.goto("/");
  5  |   await page.evaluate((session) => {
  6  |     window.localStorage.setItem("accessToken", session.accessToken);
  7  |     window.localStorage.setItem("userRole", session.user.role);
  8  |     window.localStorage.setItem("userEmail", session.user.email);
  9  |     window.localStorage.setItem("userName", session.user.name || "");
  10 |     window.localStorage.setItem("isProfileCompleted", String(session.user.isProfileCompleted));
  11 |     window.localStorage.setItem("onboardingStep", session.user.onboardingStep || "");
  12 |     document.cookie = `accessToken=${session.accessToken}; path=/; max-age=604800; samesite=lax`;
  13 |     document.cookie = `userRole=${session.user.role}; path=/; max-age=604800; samesite=lax`;
  14 |     document.cookie = `isProfileCompleted=${session.user.isProfileCompleted}; path=/; max-age=604800; samesite=lax`;
  15 |   }, auth);
  16 | }
  17 | 
  18 | test.describe("Owner profile onboarding", () => {
  19 |   test.beforeEach(async ({ request }) => {
  20 |     await request.post("http://localhost:8787/dev/reset-mock");
  21 |   });
  22 | 
  23 |   test("new Google owner must complete profile before owner workspace", async ({ page, request }) => {
  24 |     const loginResponse = await request.post("http://localhost:8787/auth/owner-google", {
  25 |       data: { idToken: "mock-new-owner-google-token" },
  26 |     });
  27 |     const auth = await loginResponse.json();
  28 |     expect(auth.nextStep).toBe("COMPLETE_PROFILE");
  29 | 
  30 |     await setOwnerSession(page, auth);
  31 |     await page.goto("/owner/dashboard");
> 32 |     await expect(page).toHaveURL(/\/complete-profile/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  33 |     await expect(page.getByRole("heading", { name: /Hoàn tất hồ sơ/i })).toBeVisible();
  34 |     await expect(page.getByLabel(/Email đã xác thực/i)).toBeDisabled();
  35 | 
  36 |     await page.getByLabel(/Họ và tên/i).fill("Nguyễn Văn Test");
  37 |     await page.getByLabel(/Số điện thoại/i).fill("0901234567");
  38 |     await page.getByLabel(/Tỉnh \/ Thành phố/i).selectOption("79");
  39 |     await page.getByLabel(/Quận \/ Huyện/i).selectOption("760");
  40 |     await page.getByLabel(/Địa chỉ chi tiết/i).fill("123 Nguyễn Huệ");
  41 |     await page.getByRole("button", { name: /^Hoàn tất$/i }).click();
  42 | 
  43 |     await expect(page).toHaveURL(/\/owner/);
  44 |     await page.goto("/owner/profile");
  45 |     await expect(page.getByRole("heading", { name: /Hồ sơ cá nhân/i })).toBeVisible();
  46 |     await expect(page.getByRole("main").getByText("Nguyễn Văn Test").first()).toBeVisible();
  47 |     await expect(page.getByRole("main").getByText("new-owner@example.com").first()).toBeVisible();
  48 | 
  49 |     await page.getByRole("link", { name: /Chỉnh sửa hồ sơ/i }).click();
  50 |     await expect(page.getByRole("heading", { name: /Cài đặt hồ sơ/i })).toBeVisible();
  51 |     await expect(page.getByLabel(/Email đã xác thực/i)).toBeDisabled();
  52 |     await page.getByLabel(/Số điện thoại/i).fill("0909999999");
  53 |     await page.getByRole("button", { name: /Lưu thay đổi/i }).click();
  54 |     await expect(page.getByText("Cập nhật hồ sơ thành công")).toBeVisible();
  55 |   });
  56 | });
  57 | 
```