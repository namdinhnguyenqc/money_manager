import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "correct-horse-battery";

const { default: authRoutes } = await import("../src/routes/auth.js");

const attempt = async (password: string, ip: string) => {
  const pending = authRoutes.request("/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ username: "admin", password }),
  });
  await vi.advanceTimersByTimeAsync(1000);
  return pending;
};

describe("admin login lockout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("locks an IP after five wrong passwords, even for the right one", async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await attempt("wrong", "10.0.0.1")).status).toBe(401);
    }
    const locked = await attempt("correct-horse-battery", "10.0.0.1");
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("does not lock other IPs and unlocks after the window", async () => {
    expect((await attempt("correct-horse-battery", "10.0.0.2")).status).toBe(200);
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    expect((await attempt("correct-horse-battery", "10.0.0.1")).status).toBe(200);
  });

  it("clears the failure count after a successful login", async () => {
    for (let i = 0; i < 4; i += 1) await attempt("wrong", "10.0.0.3");
    expect((await attempt("correct-horse-battery", "10.0.0.3")).status).toBe(200);
    for (let i = 0; i < 4; i += 1) await attempt("wrong", "10.0.0.3");
    expect((await attempt("correct-horse-battery", "10.0.0.3")).status).toBe(200);
  });
});
