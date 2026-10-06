import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL configurable via environment or default to backend cloud server
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://3.107.161.126:8080/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

import { toValidUUID } from '../utils/uuid';

// Request Interceptor: inject Bearer token and X-User-Id
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const [token, userId, userJson] = await Promise.all([
        AsyncStorage.getItem('@homeease_auth_token'),
        AsyncStorage.getItem('@homeease_user_id'),
        AsyncStorage.getItem('@homeease_user'),
      ]);

      if (config.headers) {
        config.headers['Content-Type'] = 'application/json';
        config.headers.Accept = 'application/json';

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          const rawUserId = userId || (userJson ? JSON.parse(userJson)?.userId || JSON.parse(userJson)?.id : undefined);
          const effectiveUserId = toValidUUID(rawUserId, 'd3b07384-d113-4a1d-8d2a-c45f4486ecbc');
          config.headers['X-User-Id'] = effectiveUserId;
        } else {
          const rawUserId = userId || (userJson ? JSON.parse(userJson)?.userId || JSON.parse(userJson)?.id : undefined);
          if (rawUserId) {
            config.headers['X-User-Id'] = toValidUUID(rawUserId);
          }
        }
      }
    } catch (e) {
      console.warn('[Axios] Error reading auth headers:', e);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: handle 401s, common error formatting
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn('[Axios] 401 Unauthorized encountered. Clearing session.');
      try {
        await AsyncStorage.removeItem('@homeease_auth_token');
        await AsyncStorage.removeItem('@homeease_user');
      } catch {
        // silent
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
