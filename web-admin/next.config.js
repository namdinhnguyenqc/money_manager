/** Next.js config for Web Admin */
const productionApiUrl = 'https://money-manager-xdem.onrender.com';
const localApiUrl = 'http://localhost:8787';
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
const safeApiUrl =
  process.env.NODE_ENV === 'production' && configuredApiUrl && /localhost|127\\.0\\.0\\.1/.test(configuredApiUrl)
    ? productionApiUrl
    : configuredApiUrl || (process.env.NODE_ENV === 'production' ? productionApiUrl : localApiUrl);

export default {
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    NEXT_PUBLIC_API_URL: safeApiUrl,
  },
};
