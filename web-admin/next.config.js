import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: wss:; frame-src 'self' https://accounts.google.com; object-src 'none';",
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/thanh-toan', destination: '/#payment', permanent: true },
      { source: '/payment', destination: '/#payment', permanent: true },
      { source: '/ai', destination: '/#ai', permanent: true },
      { source: '/tinh-nang', destination: '/#features', permanent: true },
      { source: '/features', destination: '/#features', permanent: true },
      { source: '/quy-trinh', destination: '/#workflow', permanent: true },
      { source: '/workflow', destination: '/#workflow', permanent: true },
      { source: '/settings', destination: '/owner/settings', permanent: true },
      { source: '/tenants', destination: '/owner/tenants', permanent: true },
      { source: '/feedback', destination: '/owner/feedback', permanent: true },
      { source: '/profile', destination: '/owner/profile', permanent: true },
      { source: '/dashboard', destination: '/owner/dashboard', permanent: true },
      { source: '/owner/rooms', destination: '/rooms', permanent: true },
      { source: '/owner/contracts', destination: '/contracts', permanent: true },
      { source: '/owner/invoices', destination: '/invoices', permanent: true },
      { source: '/owner/deposits', destination: '/deposits', permanent: true },
      { source: '/owner/payments', destination: '/payments', permanent: true },
      { source: '/owner/facilities', destination: '/facilities', permanent: true },
    ];
  },
};
