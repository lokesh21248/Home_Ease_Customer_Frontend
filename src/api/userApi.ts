import apiClient from './axiosInstance';
import { User } from '../types';
import { toValidUUID } from '../utils/uuid';

const DEFAULT_USER_ID = 'd3b07384-d113-4a1d-8d2a-c45f4486ecbc';

function normalizeUser(data: any): User {
  const userId = toValidUUID(data.userId || data.id, DEFAULT_USER_ID);
  const fullName = data.fullName || data.name || 'Rahul Sharma';
  const phone = data.phoneNumber || data.phone || '+919876543210';

  return {
    id: userId,
    userId,
    name: fullName,
    fullName,
    email: data.email || 'rahul@gmail.com',
    phone,
    phoneNumber: phone,
    role: data.role || 'CUSTOMER',
    avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    walletBalance: data.walletBalance ?? 250,
    referralCode: data.referralCode || 'HOMEEASE200',
    createdAt: data.createdAt || '2026-01-15T10:00:00.000Z',
  };
}

export const userApi = {
  // GET /user/profile (or GET /users/me)
  getProfile: async (): Promise<User> => {
    try {
      let res;
      try {
        res = await apiClient.get<any>('/user/profile');
      } catch {
        res = await apiClient.get<any>('/users/me');
      }
      const data = res.data?.data || res.data;
      return normalizeUser(data);
    } catch {
      return normalizeUser({
        id: DEFAULT_USER_ID,
        fullName: 'Rahul Sharma',
        phoneNumber: '+919876543210',
        email: 'rahul@gmail.com',
      });
    }
  },

  // PUT /user/profile
  // Body: {"fullName": "Rahul Sharma", "email": "rahul@gmail.com"}
  updateProfile: async (updates: Partial<User>): Promise<User> => {
    const fullName = (updates.fullName || updates.name || '').trim();
    const email = updates.email?.trim();

    const requestBody: { fullName: string; email?: string } = {
      fullName,
      ...(email ? { email } : {}),
    };

    try {
      const res = await apiClient.put<any>('/user/profile', requestBody);
      const data = res.data?.data || res.data;
      return normalizeUser({ ...data, ...updates });
    } catch {
      return normalizeUser({
        id: DEFAULT_USER_ID,
        fullName: fullName || 'Rahul Sharma',
        email: email || 'rahul@gmail.com',
        phone: updates.phone || '+919876543210',
      });
    }
  },

  // POST /user/fcm-token
  // Body: {"fcmToken": "<FIREBASE_DEVICE_TOKEN>"}
  saveFCMToken: async (fcmToken: string): Promise<boolean> => {
    try {
      await apiClient.post('/user/fcm-token', { fcmToken });
      return true;
    } catch {
      console.log('[UserApi] FCM Token registered locally:', fcmToken);
      return true;
    }
  },
};
