/**
 * TrọCare Mobile — App Configuration
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

function normalizeHost(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/^https?:\/\//, '')
    .replace(/^exp:\/\//, '')
    .split('/')[0]
    .split(':')[0];
}

const metroHost = normalizeHost(
  Constants.expoConfig?.hostUri ||
  Constants.manifest2?.extra?.expoGo?.debuggerHost ||
  (Constants as any).manifest?.debuggerHost
);

const apiUrlFromMetroHost = metroHost && !['localhost', '127.0.0.1', '10.0.2.2'].includes(metroHost)
  ? `http://${metroHost}:8787`
  : null;

const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
const isEmulatorOnlyEnvUrl = envApiUrl?.includes('10.0.2.2');

const defaultApiUrl = apiUrlFromMetroHost || (Platform.OS === 'android'
  ? 'http://10.0.2.2:8787'
  : 'http://localhost:8787');

const apiFallbackUrls = Array.from(new Set([
  defaultApiUrl,
  Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://localhost:8787',
  apiUrlFromMetroHost,
].filter(Boolean) as string[]));

const Config = {
  API_URL: isEmulatorOnlyEnvUrl && apiUrlFromMetroHost && Constants.isDevice ? apiUrlFromMetroHost : (envApiUrl || defaultApiUrl),

  /** Retry candidates for local dev when Android cannot reach the configured LAN host. */
  API_FALLBACK_URLS: apiFallbackUrls,

  /** Google OAuth client IDs. Client IDs are public identifiers. */
  GOOGLE_WEB_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    '1003393001588-t88qmf22623pvughsqqq0gt7b0cgmfc3.apps.googleusercontent.com',
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',

  /** Platform identifier sent in x-client-platform header */
  PLATFORM: (Platform.OS === 'android' ? 'android' : 'ios') as 'ios' | 'android',

  /** App display name */
  APP_NAME: 'TrọCare',

  /** Public website and store-policy pages */
  WEB_URL: process.env.EXPO_PUBLIC_WEB_URL || 'https://money-manager-xdem.onrender.com',

  /** Default billing day for new contracts */
  DEFAULT_BILLING_DAY: 5,

  /** Phone number length (Vietnamese) */
  PHONE_LENGTH: 10,

  /** CCCD/ID card length */
  ID_CARD_LENGTH: 12,

  /** Billing day range */
  BILLING_DAY_MIN: 1,
  BILLING_DAY_MAX: 28,

  /** Contract "soon ending" threshold in days */
  SOON_ENDING_DAYS: 30,

  /** Default pagination limit */
  DEFAULT_LIMIT: 100,
} as const;

export default Config;
