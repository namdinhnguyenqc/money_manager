import "dotenv/config";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value || value.includes("your-") || value.includes("change-in-production")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`âŒ FATAL: Missing required env var in production: ${name}`);
    }
    console.warn(`âš ï¸  Warning: Missing or placeholder env var: ${name}. Running in development mode.`);
    return "";
  }
  return value;
};

const optional = (name: string, fallback = ""): string => {
  const value = process.env[name];
  if (!value || value.includes("your-")) {
    return fallback;
  }
  return value;
};

const isProduction = process.env.NODE_ENV === "production";

const productionRequired = (name: string, fallback = ""): string => {
  return isProduction ? required(name) : optional(name, fallback);
};

if (isProduction && process.env.ADMIN_PASSWORD === "admin") {
  throw new Error(`âŒ FATAL: Default ADMIN_PASSWORD is not allowed in production!`);
}

const jwtSecret = productionRequired("JWT_SECRET", "dev-secret-ONLY-for-local-dev-do-not-use-in-prod");

export const env = {
  API_PORT: Number(process.env.API_PORT || process.env.PORT || 8787),
  SUPABASE_URL: productionRequired("SUPABASE_URL", ""),
  SUPABASE_ANON_KEY: productionRequired("SUPABASE_ANON_KEY", ""),
  SUPABASE_SERVICE_ROLE_KEY: productionRequired("SUPABASE_SERVICE_ROLE_KEY", ""),
  GOOGLE_CLIENT_ID: productionRequired("GOOGLE_CLIENT_ID", ""),
  GOOGLE_CLIENT_IDS: optional("GOOGLE_CLIENT_IDS", ""),
  GOOGLE_CLIENT_SECRET: optional("GOOGLE_CLIENT_SECRET", ""),
  ADMIN_USERNAME: optional("ADMIN_USERNAME", "admin"),
  ADMIN_PASSWORD: optional("ADMIN_PASSWORD", "admin-prod-please-change"),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRY_SECONDS: Number(process.env.JWT_EXPIRY_SECONDS || 900), // 15 minutes
  REFRESH_TOKEN_EXPIRY_DAYS: Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 30),
  SEPAY_WEBHOOK_SECRET: optional("SEPAY_WEBHOOK_SECRET", ""),
  SEPAY_API_KEY: optional("SEPAY_API_KEY", ""),
  SEPAY_PAYMENT_PREFIX: optional("SEPAY_PAYMENT_PREFIX", "TCINV"),
  // When ON, reject SePay webhooks that carry no configured secret/api-key at all.
  // Default OFF: an unconfigured deployment must still accept real payments rather
  // than 401 them away (losing money). If a secret/api-key IS configured — via env
  // or the owner's SePay settings — it is still verified strictly regardless.
  // Set SEPAY_REQUIRE_AUTH=true only after a secret is configured, to harden.
  SEPAY_REQUIRE_AUTH: (process.env.SEPAY_REQUIRE_AUTH ?? "false").toLowerCase() === "true",
  ZALO_APP_ID: optional("ZALO_APP_ID", ""),
  ZALO_APP_SECRET: optional("ZALO_APP_SECRET", ""),
  ZALO_REDIRECT_URI: optional("ZALO_REDIRECT_URI", ""),
  // Platform-owned OA. Admin connects this account once; individual owners do
  // not need to complete Zalo OAuth for automated payment reminders.
  ZALO_SHARED_OWNER_ID: optional("ZALO_SHARED_OWNER_ID", ""),
  ZALO_PAYMENT_REMINDER_TEMPLATE_ID: optional("ZALO_PAYMENT_REMINDER_TEMPLATE_ID", ""),
  ZALO_REMINDERS_ENABLED: (process.env.ZALO_REMINDERS_ENABLED ?? "false").toLowerCase() === "true",
  WEB_ADMIN_URL: optional("WEB_ADMIN_URL", "http://localhost:3001"),
  // Public site (web-admin) that serves /tin-tuc — used to trigger on-demand
  // ISR revalidation right after an article is created/updated/deleted.
  SITE_URL: optional("SITE_URL", "https://trocare-production.vercel.app"),
  REVALIDATE_SECRET: optional("REVALIDATE_SECRET", ""),
  CRON_SECRET: optional("CRON_SECRET", ""),
  // Optional distributed response cache. Upstash exposes Redis over HTTPS,
  // which avoids opening long-lived TCP connections on Render/serverless.
  UPSTASH_REDIS_REST_URL: optional("UPSTASH_REDIS_REST_URL", ""),
  UPSTASH_REDIS_REST_TOKEN: optional("UPSTASH_REDIS_REST_TOKEN", ""),
  VAPID_PUBLIC_KEY: optional("VAPID_PUBLIC_KEY", ""),
  VAPID_PRIVATE_KEY: optional("VAPID_PRIVATE_KEY", ""),
  VAPID_SUBJECT: optional("VAPID_SUBJECT", "mailto:admin@trocare.vn"),
  // CORS: comma-separated list of allowed origins, e.g. "https://admin.yourdomain.com,https://app.yourdomain.com"
  // The production web-admin domains are always included, even if the CORS_ORIGINS
  // env var on the host (e.g. Render) is missing or out of date — this is what
  // caused "fetch failed" / CORS block on tcareproduction.vercel.app when the
  // Render env var hadn't been updated to match the local .env.
  CORS_ORIGINS: Array.from(new Set([
    ...optional("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3011,http://localhost:8081,http://localhost:19006").split(",").map(s => s.trim()),
    "https://trocare-production.vercel.app",
    "https://tcareproduction.vercel.app",
  ])),
};
