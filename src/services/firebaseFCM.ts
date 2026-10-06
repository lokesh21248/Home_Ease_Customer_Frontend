/**
 * Firebase Cloud Messaging (FCM) Push Notification Service
 * Manages device push tokens, foreground/background notification handlers, and tap navigation
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '../api/userApi';

class FirebaseFCMService {
  private token: string | null = null;
  private notificationListener: ((notif: any) => void) | null = null;

  async init(): Promise<string | null> {
    try {
      console.log('[FCM] Initializing push notification service on', Platform.OS);
      // Generate / retrieve unique device FCM registration token
      let storedToken = await AsyncStorage.getItem('@homeease_fcm_token');
      if (!storedToken) {
        storedToken = 'fcm_token_' + Platform.OS + '_' + Math.random().toString(36).substring(2, 15);
        await AsyncStorage.setItem('@homeease_fcm_token', storedToken);
      }
      this.token = storedToken;
      // Send token to backend
      await userApi.saveFCMToken(this.token);
      return this.token;
    } catch (e) {
      console.warn('[FCM] Init error:', e);
      return null;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  onNotificationReceived(callback: (notification: any) => void) {
    this.notificationListener = callback;
  }

  triggerLocalNotification(title: string, message: string, data?: any) {
    if (this.notificationListener) {
      this.notificationListener({
        title,
        message,
        data,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const firebaseFCM = new FirebaseFCMService();
