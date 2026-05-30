import crypto from "crypto";
import { env } from "../config/env.js";

// Master key derived from env.JWT_SECRET (ensure it is exactly 32 bytes)
const MASTER_SECRET = env.JWT_SECRET || "dev-secret-ONLY-for-local-dev-do-not-use-in-prod";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(MASTER_SECRET).digest(); // Exactly 32 bytes
const IV_LENGTH = 16; // AES block size

/**
 * Encrypts cleartext into a secure cipher string (IV + encrypted data in hex format)
 */
export function encryptToken(token: string): string {
  if (!token) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a secure cipher string back to its original cleartext
 */
export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    const ivHex = parts.shift();
    const encryptedHex = parts.join(":");
    if (!ivHex || !encryptedHex) return "";

    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Token decryption failed:", err);
    return "";
  }
}
