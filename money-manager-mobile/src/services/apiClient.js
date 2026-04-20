import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

const clientConfig = {
  getAccessToken: async () => null,
  refreshSession: async () => false,
  onUnauthorized: async () => {},
};

export const configureApiClient = (partial = {}) => {
  if (typeof partial.getAccessToken === 'function') {
    clientConfig.getAccessToken = partial.getAccessToken;
  }
  if (typeof partial.refreshSession === 'function') {
    clientConfig.refreshSession = partial.refreshSession;
  }
  if (typeof partial.onUnauthorized === 'function') {
    clientConfig.onUnauthorized = partial.onUnauthorized;
  }
};

const readJsonSafe = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const apiClient = {
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },

  async request(endpoint, options = {}) {
    const {
      auth = true,
      retryOn401 = true,
      method = 'GET',
      headers: customHeaders = {},
      ...fetchOptions
    } = options;

    const url = `${BASE_URL}${endpoint}`;

    const buildHeaders = async () => {
      const headers = {
        ...customHeaders,
      };
      if (!headers['Content-Type'] && method !== 'GET') {
        headers['Content-Type'] = 'application/json';
      }
      if (auth) {
        const tokenFromConfig = await clientConfig.getAccessToken();
        const legacyToken = tokenFromConfig ? null : await AsyncStorage.getItem('auth_token');
        const token = tokenFromConfig || legacyToken;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      return headers;
    };

    const requestOnce = async () => {
      const headers = await buildHeaders();
      const response = await fetch(url, {
        method,
        ...fetchOptions,
        headers,
      });
      const result = await readJsonSafe(response);
      return { response, result };
    };

    try {
      let { response, result } = await requestOnce();

      if (response.status === 401 && auth && retryOn401) {
        const refreshed = await clientConfig.refreshSession();
        if (refreshed) {
          ({ response, result } = await requestOnce());
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user_data');
          await clientConfig.onUnauthorized();
        }
        const error = new Error(result?.error || result?.message || 'Something went wrong');
        error.status = response.status;
        error.data = result;
        throw error;
      }

      return result ?? {};
    } catch (error) {
      console.error(`API Error [${method}] ${endpoint}:`, error);
      throw error;
    }
  },
};

export default apiClient;
