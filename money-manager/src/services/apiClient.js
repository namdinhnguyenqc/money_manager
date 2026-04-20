const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:8787';

let _config = {
  getAccessToken: () => null,
  refreshSession: async () => false,
  onUnauthorized: async () => {},
};

export const configureApiClient = (opts) => {
  _config = { ..._config, ...opts };
};

const getHeaders = async (opts = {}) => {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (opts.auth !== false) {
    const token = _config.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const parseResponse = async (res) => {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const err = new Error(typeof data === 'object' ? data?.error : data || 'API Error');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

const executeRequest = async (url, fetchOptions, reqOptions = {}) => {
  let res = await fetch(url, fetchOptions);
  if (res.status === 401 && reqOptions.retryOn401 !== false) {
    const refreshed = await _config.refreshSession();
    if (refreshed) {
      fetchOptions.headers = await getHeaders(reqOptions);
      res = await fetch(url, fetchOptions);
    } else {
      await _config.onUnauthorized();
    }
  } else if (res.status === 401) {
    await _config.onUnauthorized();
  }
  return parseResponse(res);
};

const apiClient = {
  async get(endpoint, opts = {}) {
    const headers = await getHeaders(opts);
    return executeRequest(`${BASE_URL}${endpoint}`, { method: 'GET', headers }, opts);
  },
  async post(endpoint, body, opts = {}) {
    const headers = await getHeaders(opts);
    return executeRequest(`${BASE_URL}${endpoint}`, { method: 'POST', headers, body: JSON.stringify(body) }, opts);
  },
  async patch(endpoint, body, opts = {}) {
    const headers = await getHeaders(opts);
    return executeRequest(`${BASE_URL}${endpoint}`, { method: 'PATCH', headers, body: JSON.stringify(body) }, opts);
  },
  async delete(endpoint, opts = {}) {
    const headers = await getHeaders(opts);
    return executeRequest(`${BASE_URL}${endpoint}`, { method: 'DELETE', headers }, opts);
  },
};

export default apiClient;
