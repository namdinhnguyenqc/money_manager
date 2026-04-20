import "dotenv/config";

const optional = (name: string, fallback = ""): string => {
  const value = process.env[name];
  if (!value || value.includes("your-")) {
    console.warn(`⚠️ Warning: Missing or placeholder env var: ${name}. Mock mode may be active.`);
    return fallback;
  }
  return value;
};

export const env = {
  API_PORT: Number(process.env.API_PORT || 8787),
  SUPABASE_URL: optional("SUPABASE_URL", "http://mock-supabase.local"),
  SUPABASE_ANON_KEY: optional("SUPABASE_ANON_KEY", "mock-key"),
  SUPABASE_SERVICE_ROLE_KEY: optional("SUPABASE_SERVICE_ROLE_KEY", "mock-role"),
  IS_MOCK: !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes("your-")
};
