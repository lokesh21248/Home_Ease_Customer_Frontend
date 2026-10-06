import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NotificationItem } from '../types';
import { notificationApi } from '../api/notificationApi';
import { firebaseFCM } from '../services/firebaseFCM';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const refreshNotifications = async () => {
    const list = await notificationApi.getNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    refreshNotifications();

    // Listen for FCM push messages
    firebaseFCM.onNotificationReceived((newNotif) => {
      const item: NotificationItem = {
        id: 'notif-' + Date.now(),
        title: newNotif.title,
        message: newNotif.message,
        timestamp: 'Just now',
        read: false,
        type: newNotif.data?.type || 'system',
        targetScreen: newNotif.data?.targetScreen,
        targetParams: newNotif.data?.targetParams,
      };
      setNotifications((prev) => [item, ...prev]);
    });
  }, []);

  const markAsRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    await notificationApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
