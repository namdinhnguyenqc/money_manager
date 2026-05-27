import crypto from "crypto";
import { env } from "../config/env.js";

const DEFAULT_PREFIX = "TCINV";
const PAYMENT_CODE_SUFFIX_LENGTH = 10;

export const getPaymentCodePrefix = () => {
  const normalized = String(env.SEPAY_PAYMENT_PREFIX || DEFAULT_PREFIX)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return normalized || DEFAULT_PREFIX;
};

export const generatePaymentCode = () =>
  `${getPaymentCodePrefix()}${crypto.randomBytes(PAYMENT_CODE_SUFFIX_LENGTH / 2).toString("hex").toUpperCase()}`;

export const normalizePaymentCode = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const extractPaymentCodeFromText = (value: unknown) => {
  const prefix = getPaymentCodePrefix();
  const normalizedDirect = normalizePaymentCode(value);
  const suffix = normalizedDirect.slice(prefix.length);
  if (
    normalizedDirect.startsWith(prefix) &&
    suffix.length >= 6 &&
    suffix.length <= 24 &&
    /^[A-Z0-9]+$/.test(suffix)
  ) {
    return normalizedDirect;
  }

  const content = String(value || "").toUpperCase();
  const pattern = new RegExp(`(?:^|[^A-Z0-9])(${escapeRegex(prefix)}[A-Z0-9]{6,24})(?=$|[^A-Z0-9])`);
  return content.match(pattern)?.[1] || "";
};

export const extractPaymentCodeFromPayload = (payload: any) => {
  const direct = extractPaymentCodeFromText(payload?.code || payload?.paymentCode || payload?.payment_code);
  if (direct) return direct;

  return extractPaymentCodeFromText(payload?.content || payload?.description || payload?.transaction_content || "");
};
