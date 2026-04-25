import * as SecureStore from 'expo-secure-store';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import apiClient, { configureApiClient } from './apiClient';

const AUTH_STORAGE_KEY = 'mm_auth_v1';

const listeners = new Set();

const authState = {
  user: null,
  session: null,
  initialized: false,
  initPromise: null,
};

const toPublicUser = (user) => {
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email || null,
    name: user.name || null,
    avatar: user.avatar || null,
    role: user.role || 'USER',
    status: user.status || 'ACTIVE',
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
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    return;
  }

  await SecureStore.setItemAsync(
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
    accessToken: payload?.accessToken,
    refreshToken: payload?.refreshToken,
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
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
  if (emit) notifyListeners();
};

export const configureGoogleSignIn = (webClientId) => {
  GoogleSignin.configure({
    webClientId,
    offlineUseStandaloneApp: false,
    forceCodeForRefreshToken: true,
  });
};

export const getCurrentUser = () => authState.user;
export const getAuthSession = () => authState.session;
export const getAccessToken = () => authState.session?.accessToken || null;
export const isAuthenticated = () => Boolean(authState.user && authState.session?.accessToken);

export const hasGooglePlayServices = async () => {
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
      { auth: false, retryOn401: false }
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
      const raw = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          authState.user = parsed?.user || null;
          authState.session = parsed?.session || null;
        } catch {
          await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
          authState.user = null;
          authState.session = null;
        }
      }

  if (authState.session?.accessToken) {
        try {
        const me = await apiClient.get('/auth/me', { retryOn401: true });
        const user = toPublicUser(me);
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

export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    if (!userInfo.idToken) {
      throw new Error('No ID token from Google');
    }

    const payload = await apiClient.post(
      '/auth/google',
      { idToken: userInfo.idToken },
      { auth: false, retryOn401: false }
    );

    return applyAuthPayload(payload);
  } catch (error) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Đã hủy đăng nhập');
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Đang trong quá trình đăng nhập');
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services không khả dụng');
    }
    throw error;
  }
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
