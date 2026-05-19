import * as SecureStore from 'expo-secure-store';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import apiClient, { configureApiClient } from './apiClient';

const AUTH_STORAGE_KEY = 'mm_auth_v1';

const listeners = new Set();

const authState = {
  user: null,
  session: null,
  initialized: false,
  initPromise: null,
};

let googleWebClientId = '';
let googleWebScriptPromise = null;

const authStorage = {
  async getItem(key) {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key) {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

const toPublicUser = (user) => {
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email || null,
    name: user.name || null,
    avatar: user.avatar || null,
    avatarUrl: user.avatarUrl || user.avatar_url || user.avatar || null,
    role: user.role || 'USER',
    status: user.status || 'ACTIVE',
    authProvider: user.authProvider || user.auth_provider || null,
    isProfileCompleted: user.isProfileCompleted ?? user.is_profile_completed ?? true,
    onboardingStep: user.onboardingStep || user.onboarding_step || 'DONE',
  };
};

const toPublicSession = (session) => {
  if (!session?.accessToken || !session?.refreshToken) return null;
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt || null,
  };
};

const notifyListeners = () => {
  listeners.forEach((callback) => {
    try {
      callback(authState.user);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
};

const persistState = async () => {
  if (!authState.user || !authState.session) {
    await authStorage.deleteItem(AUTH_STORAGE_KEY);
    return;
  }

  await authStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      user: authState.user,
      session: authState.session,
    })
  );
};

const applyAuthPayload = async (payload, { emit = true } = {}) => {
  const user = toPublicUser(payload?.user);
  const session = toPublicSession({
    accessToken: payload?.accessToken || payload?.session?.access_token,
    refreshToken: payload?.refreshToken || payload?.session?.refresh_token,
    expiresAt: payload?.expiresAt || payload?.session?.expires_at,
  });

  if (!user || !session) {
    throw new Error('Invalid auth session');
  }

  authState.user = user;
  authState.session = session;
  await persistState();
  if (emit) notifyListeners();
  return user;
};

const clearAuthState = async ({ emit = true } = {}) => {
  authState.user = null;
  authState.session = null;
  await authStorage.deleteItem(AUTH_STORAGE_KEY);
  if (emit) notifyListeners();
};

export const configureGoogleSignIn = (webClientId) => {
  googleWebClientId = webClientId || googleWebClientId;
  if (Platform.OS === 'web') return;
  GoogleSignin.configure({
    webClientId,
    offlineUseStandaloneApp: false,
    forceCodeForRefreshToken: true,
  });
};

export const getCurrentUser = () => authState.user;
export const getAuthSession = () => authState.session;
export const getAccessToken = () => authState.session?.accessToken || null;
export const getAuthToken = async () => getAccessToken();
export const isAuthenticated = () => Boolean(authState.user && authState.session?.accessToken);

export const hasGooglePlayServices = async () => {
  if (Platform.OS === 'web') return false;
  const hasPlayServices = await GoogleSignin.hasPlayServices();
  return hasPlayServices;
};

export const refreshSession = async ({ silent = false } = {}) => {
  const refreshToken = authState.session?.refreshToken;
  if (!refreshToken) {
    if (!silent) throw new Error('No refresh token');
    return false;
  }

  try {
    const payload = await apiClient.post(
      '/auth/refresh',
      { refreshToken },
      { auth: false, retryOn401: false, suppressErrorLog: true }
    );
    await applyAuthPayload(payload, { emit: !silent });
    return true;
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status === 400 || status === 401) {
      await clearAuthState({ emit: !silent });
    }
    if (!silent) throw error;
    return false;
  }
};

export const initAuth = async () => {
  if (authState.initialized) return;
  if (authState.initPromise) return authState.initPromise;

  authState.initPromise = (async () => {
    try {
      const raw = await authStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          authState.user = parsed?.user || null;
          authState.session = parsed?.session || null;
        } catch {
          await authStorage.deleteItem(AUTH_STORAGE_KEY);
          authState.user = null;
          authState.session = null;
        }
      }

      if (authState.session?.accessToken) {
        try {
          const me = await apiClient.get('/auth/me', {
            retryOn401: true,
            suppressErrorLog: true,
          });
          const user = toPublicUser(me?.user || me);
          if (user) {
            authState.user = user;
            await persistState();
          } else {
            await refreshSession({ silent: true });
          }
        } catch (error) {
          const status = Number(error?.status || 0);
          if (status === 400 || status === 401) {
            await refreshSession({ silent: true });
          }
        }
      }
    } finally {
      authState.initialized = true;
      authState.initPromise = null;
      notifyListeners();
    }
  })();

  return authState.initPromise;
};

configureApiClient({
  getAccessToken: async () => getAccessToken(),
  refreshSession: async () => refreshSession({ silent: true }),
  onUnauthorized: async () => clearAuthState({ emit: true }),
});

const loadGoogleIdentityScript = () => {
  if (Platform.OS !== 'web') return Promise.resolve();
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Google login chỉ hỗ trợ trong trình duyệt.'));
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleWebScriptPromise) return googleWebScriptPromise;

  googleWebScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Không tải được Google Sign-In.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không tải được Google Sign-In.'));
    document.head.appendChild(script);
  });

  return googleWebScriptPromise;
};

const signInWithGoogleWeb = async () => {
  const clientId =
    googleWebClientId ||
    (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_GOOGLE_CLIENT_ID : '') ||
    (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID : '');

  if (!clientId) {
    throw new Error('Google OAuth chưa được cấu hình cho website.');
  }

  await loadGoogleIdentityScript();

  const idToken = await new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Không nhận được phản hồi từ Google. Vui lòng thử lại.'));
      }
    }, 60000);

    window.google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: 'popup',
      callback: (response) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        if (response?.credential) {
          resolve(response.credential);
          return;
        }
        reject(new Error('Google không trả về credential.'));
      },
    });

    window.google.accounts.id.prompt((notification) => {
      if (settled) return;
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        settled = true;
        window.clearTimeout(timeoutId);
        reject(new Error('Google Sign-In không hiển thị được. Kiểm tra OAuth Authorized JavaScript origins cho domain website.'));
      }
    });
  });

  return signInWithOwnerGoogleIdToken(idToken);
};

export const signInWithGoogle = async () => {
  try {
    if (Platform.OS === 'web') {
      return signInWithGoogleWeb();
    }
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo?.idToken || userInfo?.data?.idToken;

    if (!idToken) {
      throw new Error('No ID token from Google');
    }

    const payload = await apiClient.post(
      '/auth/owner-google',
      { idToken },
      { auth: false, retryOn401: false }
    );

    return applyAuthPayload(payload);
  } catch (error) {
    if (error.code === statusCodes?.SIGN_IN_CANCELLED) {
      throw new Error('Đã hủy đăng nhập');
    }
    if (error.code === statusCodes?.IN_PROGRESS) {
      throw new Error('Đang trong quá trình đăng nhập');
    }
    if (error.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services không khả dụng');
    }
    throw error;
  }
};

export const signInWithOwnerGoogleIdToken = async (idToken) => {
  const payload = await apiClient.post(
    '/auth/owner-google',
    { idToken },
    { auth: false, retryOn401: false }
  );
  return applyAuthPayload(payload);
};

export const updateCurrentUser = async (nextUser) => {
  authState.user = toPublicUser({ ...authState.user, ...nextUser });
  await persistState();
  notifyListeners();
  return authState.user;
};

export const login = async (email, password) => {
  const payload = await apiClient.post(
    '/auth/login',
    { email, password },
    { auth: false, retryOn401: false }
  );
  return applyAuthPayload(payload);
};

export const signUp = async (email, password) => {
  const payload = await apiClient.post(
    '/auth/signup',
    { email, password },
    { auth: false, retryOn401: false }
  );
  if (!payload?.session) {
    throw new Error('Sign-up successful. Please check your email to verify your account.');
  }
  return applyAuthPayload(payload);
};

export const logOut = async () => {
  try {
    const refreshToken = authState.session?.refreshToken;
    if (refreshToken) {
      await apiClient.post(
        '/auth/logout',
        { refreshToken },
        { auth: false, retryOn401: false }
      );
    }
  } catch (e) {
    console.warn('Logout request failed:', e?.message || e);
  } finally {
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      console.warn('Google sign out failed:', e);
    }
    await clearAuthState({ emit: true });

    // Clear local database to prevent data leaking to next user
    try {
      const { resetDatabase } = require('../database/db');
      await resetDatabase();
    } catch (dbError) {
      console.error('Failed to reset database on logout:', dbError);
    }
  }
};

export const subscribeToAuthChanges = (callback) => {
  listeners.add(callback);

  if (authState.initialized) {
    callback(authState.user);
  } else {
    initAuth();
  }

  return () => {
    listeners.delete(callback);
  };
};
