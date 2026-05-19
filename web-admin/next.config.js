/** Next.js config for Web Admin */
const productionApiUrl = 'https://money-manager-xdem.onrender.com';
const localApiUrl = 'http://localhost:8787';

export default {
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || (process.env.NODE_ENV === 'production' ? productionApiUrl : localApiUrl),
  },
};
