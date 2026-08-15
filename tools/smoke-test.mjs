#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 * Type-checking and unit tests pass on code that still ships a broken site:
 * this repo has shipped a dashboard that threw at render, an API route that
 * selected a non-existent column, and an admin project that quietly built and
 * served the owner app instead. None of those were type errors, and none were
 * caught before a human opened the page.
 *
 * So this checks the two things a build pipeline otherwise never asserts:
 *   1. the route answers with the expected status, and
 *   2. the bytes that came back belong to the app that was supposed to deploy.
 *
 * Check 2 matters most. A misconfigured project still returns 200 for "/" — it
 * is just serving the wrong application, which is exactly how the admin portal
 * went unnoticed.
 *
 * Usage:
 *   node tools/smoke-test.mjs                  # check every target
 *   node tools/smoke-test.mjs owner            # check one target
 *   OWNER_URL=https://staging.example.com node tools/smoke-test.mjs owner
 *
 * Exits non-zero on the first failing check so CI stops the pipeline.
 */

const TARGETS = {
  owner: {
    label: "Web chủ trọ (web-admin/)",
    baseUrl: process.env.OWNER_URL || "https://trocare-production.vercel.app",
    checks: [
      // The owner app must serve the marketing page, not redirect into /admin.
      { path: "/", status: 200, mustInclude: "quản lý phòng trọ miễn phí" },
      { path: "/login", status: 200, mustInclude: "Đăng nhập" },
      // Proves this is the owner build: admin-portal has no /owner routes at all.
      { path: "/owner/dashboard", status: 200 },
    ],
  },
  admin: {
    label: "Cổng admin (admin-portal/)",
    baseUrl: process.env.ADMIN_URL || "https://tcareproduction.vercel.app",
    checks: [
      // These two are the tell. They exist only in admin-portal, so a 404 here
      // means the project built the owner app again.
      { path: "/admin/owners", status: 200, mustInclude: "TrọCare Admin" },
      { path: "/admin/users", status: 200, mustInclude: "TrọCare Admin" },
      { path: "/admin", status: 200, mustInclude: "TrọCare Admin" },
      // Conversely, an owner route must NOT resolve here.
      { path: "/owner/dashboard", status: 404 },
    ],
  },
  api: {
    label: "Backend (backend/)",
    baseUrl: process.env.API_URL || "https://money-manager-xdem.onrender.com",
    checks: [
      { path: "/health", status: 200 },
      // Unauthenticated must be rejected, not 500. A 500 here has previously
      // meant a broken SQL column reached production.
      { path: "/owner/cashflow-summary?months=12", status: 401 },
    ],
  },
};

const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 30000);

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function runCheck(baseUrl, check) {
  const url = `${baseUrl}${check.path}`;
  let response;
  try {
    response = await fetchWithTimeout(url);
  } catch (err) {
    return { ok: false, url, reason: `không gọi được: ${err.name === "AbortError" ? `quá ${TIMEOUT_MS}ms` : err.message}` };
  }

  // The owner app redirects /admin/* to the admin domain, so following
  // redirects blindly made this pass while pointed at the wrong host — it was
  // grading the site it got bounced to, not the site under test. The whole
  // point here is "does THIS host serve THIS app", so leaving the origin is a
  // failure unless a check opts in.
  const finalOrigin = new URL(response.url).origin;
  const expectedOrigin = new URL(baseUrl).origin;
  if (!check.allowCrossOrigin && finalOrigin !== expectedOrigin) {
    return { ok: false, url, reason: `bị chuyển sang ${finalOrigin} — host này không tự phục vụ route đó` };
  }

  if (response.status !== check.status) {
    return { ok: false, url, reason: `mong đợi HTTP ${check.status}, nhận ${response.status}` };
  }

  if (check.mustInclude) {
    const body = await response.text();
    if (!body.includes(check.mustInclude)) {
      return { ok: false, url, reason: `không tìm thấy "${check.mustInclude}" — nhiều khả năng deploy nhầm app` };
    }
  }

  return { ok: true, url, status: response.status };
}

async function main() {
  const requested = process.argv.slice(2);
  const names = requested.length > 0 ? requested : Object.keys(TARGETS);

  const unknown = names.filter((n) => !TARGETS[n]);
  if (unknown.length > 0) {
    console.error(`Không biết target: ${unknown.join(", ")}`);
    console.error(`Hợp lệ: ${Object.keys(TARGETS).join(", ")}`);
    process.exit(2);
  }

  let failures = 0;

  for (const name of names) {
    const target = TARGETS[name];
    console.log(`\n${target.label}\n  ${target.baseUrl}`);

    for (const check of target.checks) {
      const result = await runCheck(target.baseUrl, check);
      if (result.ok) {
        console.log(`  ✓ ${check.path} → ${result.status}`);
      } else {
        failures += 1;
        console.log(`  ✗ ${check.path} — ${result.reason}`);
      }
    }
  }

  console.log("");
  if (failures > 0) {
    console.error(`Smoke test THẤT BẠI: ${failures} lỗi.`);
    process.exit(1);
  }
  console.log("Smoke test PASS.");
}

main().catch((err) => {
  console.error("Smoke test lỗi bất thường:", err);
  process.exit(1);
});
