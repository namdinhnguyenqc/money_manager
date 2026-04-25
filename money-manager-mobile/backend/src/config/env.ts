import "dotenv/config";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value || value.includes("your-") || value.includes("change-in-production")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`❌ FATAL: Missing required env var in production: ${name}`);
    }
    console.warn(`⚠️  Warning: Missing or placeholder env var: ${name}. Running in MOCK/DEV mode.`);
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

const jwtSecret = optional("JWT_SECRET", "dev-secret-ONLY-for-local-dev-do-not-use-in-prod");

export const env = {
  API_PORT: Number(process.env.API_PORT || 8787),
  SUPABASE_URL: optional("SUPABASE_URL", "http://mock-supabase.local"),
  SUPABASE_ANON_KEY: optional("SUPABASE_ANON_KEY", "mock-key"),
  SUPABASE_SERVICE_ROLE_KEY: optional("SUPABASE_SERVICE_ROLE_KEY", "mock-role"),
  IS_MOCK: !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes("your-"),
  GOOGLE_CLIENT_ID: optional("GOOGLE_CLIENT_ID", ""),
  GOOGLE_CLIENT_SECRET: optional("GOOGLE_CLIENT_SECRET", ""),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRY_SECONDS: Number(process.env.JWT_EXPIRY_SECONDS || 900), // 15 minutes
  REFRESH_TOKEN_EXPIRY_DAYS: Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 30),
  // CORS: comma-separated list of allowed origins, e.g. "https://admin.yourdomain.com,https://app.yourdomain.com"
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:8081,http://localhost:19006").split(",").map(s => s.trim()),
};
