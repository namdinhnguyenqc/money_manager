/** Next.js config for Web Admin */
module.exports = {
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3000',
  },
};
