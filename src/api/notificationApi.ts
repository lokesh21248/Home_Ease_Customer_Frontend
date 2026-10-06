import apiClient from './axiosInstance';
import { NotificationItem } from '../types';
import { MOCK_NOTIFICATIONS } from '../constants/mockData';

let localNotifications = [...MOCK_NOTIFICATIONS];

export const notificationApi = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    try {
      const res = await apiClient.get<NotificationItem[]>('/notifications');
      return res.data;
    } catch {
      return localNotifications;
    }
  },

  markAsRead: async (id: string): Promise<boolean> => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      return true;
    } catch {
      localNotifications = localNotifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      return true;
    }
  },

  markAllAsRead: async (): Promise<boolean> => {
    try {
      await apiClient.put('/notifications/read-all');
      return true;
    } catch {
      localNotifications = localNotifications.map((n) => ({ ...n, read: true }));
      return true;
    }
  },
};
