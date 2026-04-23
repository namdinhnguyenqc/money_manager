import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  getReactNativePersistence,
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID,
};

const REQUIRED_FIREBASE_KEYS = [
  'EXPO_PUBLIC_API_KEY',
  'EXPO_PUBLIC_AUTH_DOMAIN',
  'EXPO_PUBLIC_PROJECT_ID',
  'EXPO_PUBLIC_APP_ID',
];

const getMissingFirebaseEnvKeys = () =>
  REQUIRED_FIREBASE_KEYS.filter((key) => !String(process.env[key] || '').trim());

const createAuth = (firebaseApp) => {
  if (!firebaseApp) {
    return null;
  }

  if (Platform.OS === 'web') {
    try {
      const webAuth = getAuth(firebaseApp);
      webAuth.setPersistence(browserLocalPersistence).catch((err) => {
        console.warn('Failed to set web auth persistence:', err?.message || err);
      });
      return webAuth;
    } catch (err) {
      console.warn('Failed to initialize web auth:', err?.message || err);
      return null;
    }
  }

  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    try {
      return getAuth(firebaseApp);
    } catch (err) {
      console.warn('Failed to initialize native auth:', err?.message || err);
      return null;
    }
  }
};

let app = null;
let auth = null;
let db = null;

const missingFirebaseKeys = getMissingFirebaseEnvKeys();
if (missingFirebaseKeys.length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    auth = createAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn('Firebase disabled due to initialization error:', err?.message || err);
    app = null;
    auth = null;
    db = null;
  }
} else {
  console.warn(
    `Firebase disabled: missing env vars ${missingFirebaseKeys.join(', ')}.`
  );
}

export { app, auth, db };
export const isFirebaseConfigured = () => Boolean(app && auth && db);

export default app;
