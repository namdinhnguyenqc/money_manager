import crypto from "crypto";

const timingSafeEqualText = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const extractSepayApiKey = (apiKeyHeader?: string, authHeader?: string) => {
  if (apiKeyHeader?.trim()) return apiKeyHeader.trim();
  if (!authHeader?.trim()) return undefined;
  const match = authHeader.trim().match(/^(?:Bearer|Apikey)\s+(.+)$/i);
  return match?.[1]?.trim();
};

type VerifySepayAuthInput = {
  rawBody: string;
  signature?: string;
  timestamp?: string;
  apiKey?: string;
  configuredSecret?: string | null;
  configuredApiKey?: string | null;
  requireAuth?: boolean;
};

/**
 * SePay commonly authenticates webhooks with `Authorization: Apikey ...`.
 * Some installations use an HMAC signature instead. When both credentials are
 * configured, accepting either valid mechanism prevents a valid API-key webhook
 * from being rejected merely because it has no custom HMAC header.
 */
export const verifySepayWebhookAuth = (input: VerifySepayAuthInput) => {
  const secret = input.configuredSecret?.trim() || "";
  const expectedApiKey = input.configuredApiKey?.trim() || "";
  const hasConfiguredCredential = Boolean(secret || expectedApiKey);

  if (!hasConfiguredCredential) return !input.requireAuth;

  const apiKeyValid = Boolean(
    expectedApiKey && input.apiKey && timingSafeEqualText(input.apiKey, expectedApiKey),
  );

  let signatureValid = false;
  if (secret && input.signature) {
    const cleaned = input.signature.replace(/^sha256=/i, "");
    const candidates = [
      crypto.createHmac("sha256", secret).update(`${input.timestamp || ""}.${input.rawBody}`).digest("hex"),
      crypto.createHmac("sha256", secret).update(input.rawBody).digest("hex"),
    ];
    signatureValid = candidates.some((candidate) => timingSafeEqualText(candidate, cleaned));
  }

  return apiKeyValid || signatureValid;
};
