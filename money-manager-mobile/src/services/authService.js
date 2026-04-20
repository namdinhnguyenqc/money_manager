import AsyncStorage from '@react-native-async-storage/async-storage';
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
  };
};

const toPublicSession = (session) => {
  if (!session?.access_token || !session?.refresh_token) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at || null,
    tokenType: session.token_type || 'bearer',
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
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      user: authState.user,
      session: authState.session,
    })
  );
};

const applyAuthPayload = async (payload, { emit = true } = {}) => {
  const user = toPublicUser(payload?.user);
  const session = toPublicSession(payload?.session);

  if (!user || !session) {
    throw new Error('Phien dang nhap khong hop le');
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
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  if (emit) notifyListeners();
};

export const getCurrentUser = () => authState.user;
export const getAuthSession = () => authState.session;
export const getAccessToken = () => authState.session?.accessToken || null;
export const isAuthenticated = () => Boolean(authState.user && authState.session?.accessToken);

export const refreshSession = async ({ silent = false } = {}) => {
  const refreshToken = authState.session?.refreshToken;
  if (!refreshToken) {
    if (!silent) throw new Error('Khong co refresh token');
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
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          authState.user = parsed?.user || null;
          authState.session = parsed?.session || null;
        } catch {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          authState.user = null;
          authState.session = null;
        }
      }

      if (authState.session?.accessToken) {
        try {
          const me = await apiClient.get('/auth/me', { retryOn401: true });
          const user = toPublicUser(me?.user);
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
    throw new Error('Dang ky thanh cong. Vui long kiem tra email de xac thuc tai khoan.');
  }
  return applyAuthPayload(payload);
};

export const logOut = async () => {
  try {
    await apiClient.post('/auth/logout', {}, { auth: true, retryOn401: false });
  } catch (e) {
    console.warn('Logout request failed:', e?.message || e);
  } finally {
    await clearAuthState({ emit: true });
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
