export const PRODUCTION_API_URL = "https://money-manager-xdem.onrender.com";
export const LOCAL_API_URL = "http://localhost:8787";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const isLocalApiUrl = configuredApiUrl?.includes("localhost") || configuredApiUrl?.includes("127.0.0.1");

export const API_URL =
  (process.env.NODE_ENV === "production" && isLocalApiUrl ? undefined : configuredApiUrl) ||
  (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : LOCAL_API_URL);
