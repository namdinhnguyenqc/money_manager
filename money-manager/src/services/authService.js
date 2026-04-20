import apiClient, { configureApiClient } from './apiClient';

const STORAGE_KEY = 'mm_auth_v1';

let authState = { user: null, session: null, initialized: false };
const listeners = new Set();

const toPublicUser = (u) => (u?.id ? { id: u.id, email: u.email || null } : null);
const toPublicSession = (s) =>
  s?.access_token && s?.refresh_token
    ? { accessToken: s.access_token, refreshToken: s.refresh_token, expiresAt: s.expires_at || null }
    : null;

const notify = () => listeners.forEach((cb) => { try { cb(authState.user); } catch (_) {} });

const persist = () => {
  if (authState.user && authState.session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: authState.user, session: authState.session }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const applyPayload = (payload) => {
  const user = toPublicUser(payload?.user);
  const session = toPublicSession(payload?.session);
  if (!user || !session) throw new Error('Invalid auth payload');
  authState.user = user;
  authState.session = session;
  persist();
  notify();
  return user;
};

const clearState = () => {
  authState.user = null;
  authState.session = null;
  localStorage.removeItem(STORAGE_KEY);
  notify();
};

export const getAccessToken = () => authState.session?.accessToken || null;
export const getCurrentUser = () => authState.user;
export const isAuthenticated = () => Boolean(authState.user && authState.session?.accessToken);

export const refreshSession = async ({ silent = false } = {}) => {
  const rt = authState.session?.refreshToken;
  if (!rt) { if (!silent) throw new Error('No refresh token'); return false; }
  try {
    const payload = await apiClient.post('/auth/refresh', { refreshToken: rt }, { auth: false, retryOn401: false });
    applyPayload(payload);
    return true;
  } catch (e) {
    if ([400, 401].includes(Number(e?.status))) clearState();
    if (!silent) throw e;
    return false;
  }
};

export const initAuth = async () => {
  if (authState.initialized) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        authState.user = parsed?.user || null;
        authState.session = parsed?.session || null;
      } catch { localStorage.removeItem(STORAGE_KEY); }
    }
    if (authState.session?.accessToken) {
      try {
        const me = await apiClient.get('/auth/me', { retryOn401: true });
        const user = toPublicUser(me?.user);
        if (user) { authState.user = user; persist(); }
        else await refreshSession({ silent: true });
      } catch (e) {
        if ([400, 401].includes(Number(e?.status))) await refreshSession({ silent: true });
      }
    }
  } finally {
    authState.initialized = true;
    notify();
  }
};

configureApiClient({
  getAccessToken: () => getAccessToken(),
  refreshSession: () => refreshSession({ silent: true }),
  onUnauthorized: () => clearState(),
});

export const login = async (email, password) => {
  const payload = await apiClient.post('/auth/login', { email, password }, { auth: false, retryOn401: false });
  return applyPayload(payload);
};

export const signUp = async (email, password) => {
  const payload = await apiClient.post('/auth/signup', { email, password }, { auth: false, retryOn401: false });
  return applyPayload(payload);
};

export const logOut = async () => {
  try { await apiClient.post('/auth/logout', {}, { retryOn401: false }); } catch (_) {}
  finally { clearState(); }
};

export const subscribeToAuthChanges = (cb) => {
  listeners.add(cb);
  if (authState.initialized) cb(authState.user);
  else initAuth();
  return () => listeners.delete(cb);
};
