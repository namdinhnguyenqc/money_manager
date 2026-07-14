import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { extractSepayApiKey, verifySepayWebhookAuth } from "../src/services/sepayAuth.js";

describe("SePay webhook authentication", () => {
  it("extracts the official Apikey authorization format", () => {
    expect(extractSepayApiKey(undefined, "Apikey secret-123")).toBe("secret-123");
    expect(extractSepayApiKey(undefined, "Bearer secret-456")).toBe("secret-456");
  });

  it("rejects malformed authorization headers", () => {
    expect(extractSepayApiKey(undefined, "secret-123")).toBeUndefined();
  });

  it("accepts a valid API key when both API key and HMAC secret are configured", () => {
    expect(verifySepayWebhookAuth({
      rawBody: "{}",
      apiKey: "api-key",
      configuredApiKey: "api-key",
      configuredSecret: "hmac-secret",
      requireAuth: true,
    })).toBe(true);
  });

  it("accepts a valid HMAC signature without an API key", () => {
    const rawBody = JSON.stringify({ id: 123 });
    const signature = crypto.createHmac("sha256", "hmac-secret").update(rawBody).digest("hex");
    expect(verifySepayWebhookAuth({
      rawBody,
      signature,
      configuredApiKey: "api-key",
      configuredSecret: "hmac-secret",
      requireAuth: true,
    })).toBe(true);
  });

  it("fails closed when authentication is required but no credential is configured", () => {
    expect(verifySepayWebhookAuth({ rawBody: "{}", requireAuth: true })).toBe(false);
  });

  it("rejects invalid configured credentials", () => {
    expect(verifySepayWebhookAuth({
      rawBody: "{}",
      apiKey: "wrong",
      configuredApiKey: "expected",
    })).toBe(false);
  });
});
