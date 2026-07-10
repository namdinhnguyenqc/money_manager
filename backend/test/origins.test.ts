import { describe, expect, it } from "vitest";
import {
  buildTrustedOrigins,
  isAllowedCorsOrigin,
  isNativeClientPlatform,
  isTrustedBrowserOrigin,
  normalizeOrigin,
} from "../src/security/origins.js";

const trustedOrigins = buildTrustedOrigins([
  "https://app.trocare.vn/",
  "https://tcareproduction.vercel.app",
]);

describe("origin security policy", () => {
  it("normalizes configured origins and rejects non-http schemes", () => {
    expect(normalizeOrigin("https://app.trocare.vn/path")).toBe("https://app.trocare.vn");
    expect(normalizeOrigin("javascript:alert(1)")).toBeNull();
  });

  it("allows only explicitly trusted origins in production", () => {
    expect(isAllowedCorsOrigin({ origin: "https://app.trocare.vn", isProduction: true, trustedOrigins })).toBe(true);
    expect(isAllowedCorsOrigin({ origin: "https://attacker.vercel.app", isProduction: true, trustedOrigins })).toBe(false);
    expect(isAllowedCorsOrigin({ origin: "https://attacker.onrender.com", isProduction: true, trustedOrigins })).toBe(false);
    expect(isAllowedCorsOrigin({ origin: "http://localhost:3001", isProduction: true, trustedOrigins })).toBe(false);
  });

  it("allows loopback origins only during development", () => {
    expect(isAllowedCorsOrigin({ origin: "http://localhost:3001", isProduction: false, trustedOrigins })).toBe(true);
    expect(isAllowedCorsOrigin({ origin: "http://127.0.0.1:8081", isProduction: false, trustedOrigins })).toBe(true);
    expect(isAllowedCorsOrigin({ origin: "https://random.example", isProduction: false, trustedOrigins })).toBe(false);
  });

  it("permits origin-less native/server clients but rejects untrusted browser refreshes", () => {
    expect(isTrustedBrowserOrigin({ origin: undefined, isProduction: true, trustedOrigins })).toBe(true);
    expect(isTrustedBrowserOrigin({ origin: "https://attacker.vercel.app", isProduction: true, trustedOrigins })).toBe(false);
  });

  it("returns refresh tokens only to known native platform identifiers", () => {
    expect(isNativeClientPlatform("ios")).toBe(true);
    expect(isNativeClientPlatform("android")).toBe(true);
    expect(isNativeClientPlatform("web")).toBe(false);
    expect(isNativeClientPlatform("attacker-controlled")).toBe(false);
  });
});
