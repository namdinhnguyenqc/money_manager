export const PRODUCTION_API_URL = "https://money-manager-xdem.onrender.com";
export const LOCAL_API_URL = "http://localhost:8787";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : LOCAL_API_URL);
