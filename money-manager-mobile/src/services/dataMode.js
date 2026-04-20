import { isAuthenticated } from './authService';

const API_DATA_FLAG = String(process.env.EXPO_PUBLIC_ENABLE_API_DATA || 'false').toLowerCase();

export const isApiDataEnabled = () => API_DATA_FLAG === 'true';

export const shouldUseApiData = () => isApiDataEnabled() && isAuthenticated();
