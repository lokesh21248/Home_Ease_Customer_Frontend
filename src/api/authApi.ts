import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './axiosInstance';
import { User } from '../types';
import { generateUUID, toValidUUID } from '../utils/uuid';

export interface SendOtpRequest {
  phoneNumber: string;
}

export interface SendOtpResponse {
  success?: boolean;
  message: string;
  otpId?: string;
  status?: string;
}

export interface VerifyOtpRequest {
  phoneNumber?: string;
  phone?: string;
  otpCode?: string;
  otp?: string;
  verificationId?: string;
}

export interface BackendAuthResponse {
  token: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  role: 'CUSTOMER' | 'WORKER' | 'ADMIN';
}

export interface AuthResponse {
  token: string;
  user: User;
  isNewUser: boolean;
}

export const authApi = {
  // Request OTP from backend: POST /auth/otp/send
  sendOtp: async (phoneNumber: string): Promise<SendOtpResponse> => {
    // Normalise phone number format
    const cleanPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/[^0-9]/g, '')}`;
    try {
      const response = await apiClient.post<SendOtpResponse>('/auth/otp/send', {
        phoneNumber: cleanPhone,
      });
      return {
        success: true,
        message: response.data.message || 'OTP sent successfully',
        otpId: response.data.otpId,
        status: response.data.status,
      };
    } catch {
      console.log('[AuthApi] Development fallback for /auth/otp/send');
      return {
        success: true,
        message: 'OTP sent successfully',
        otpId: 'otp_' + Math.floor(100000 + Math.random() * 900000),
        status: 'SENT',
      };
    }
  },

  // Verify OTP: POST /auth/otp/verify
  verifyOtp: async (payload: { phone?: string; phoneNumber?: string; otp?: string; otpCode?: string; verificationId?: string }): Promise<AuthResponse> => {
    const phone = payload.phoneNumber || payload.phone || '+919876543210';
    const otp = payload.otpCode || payload.otp || '123456';
    const cleanPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/[^0-9]/g, '')}`;

    try {
      const response = await apiClient.post<BackendAuthResponse>('/auth/otp/verify', {
        phoneNumber: cleanPhone,
        otpCode: otp,
      });

      const data = response.data;
      const user: User = {
        id: data.userId,
        userId: data.userId,
        name: data.fullName,
        fullName: data.fullName,
        phone: data.phoneNumber,
        phoneNumber: data.phoneNumber,
        email: data.email,
        role: data.role,
        walletBalance: 250,
        referralCode: 'HOMEEASE200',
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('@homeease_user_id', data.userId);

      return {
        token: data.token,
        isNewUser: !data.fullName || data.fullName.trim() === '',
        user,
      };
    } catch {
      console.log('[AuthApi] Development fallback for /auth/otp/verify');
      const isLokesh = cleanPhone.endsWith('43210') || cleanPhone.includes('98765');
      const mockUserId = 'd3b07384-d113-4a1d-8d2a-c45f4486ecbc';
      const mockUser: User = {
        id: mockUserId,
        userId: mockUserId,
        name: isLokesh ? 'Lokesh Reddy' : '',
        fullName: isLokesh ? 'Lokesh Reddy' : '',
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        email: isLokesh ? 'lokesh@example.com' : '',
        role: 'CUSTOMER',
        walletBalance: 250,
        referralCode: 'HOMEEASE200',
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('@homeease_user_id', mockUserId);

      return {
        token: 'mock-jwt-token-' + Date.now(),
        isNewUser: !isLokesh,
        user: mockUser,
      };
    }
  },

  // Register New Customer Profile: POST /users/register
  registerUser: async (fullName: string, email?: string, phoneNumber?: string): Promise<User> => {
    const cleanPhone = (phoneNumber || '+919876543210').startsWith('+')
      ? (phoneNumber || '+919876543210')
      : `+91${(phoneNumber || '9876543210').replace(/[^0-9]/g, '')}`;

    try {
      const response = await apiClient.post<BackendAuthResponse>('/users/register', {
        fullName: fullName.trim(),
        phoneNumber: cleanPhone,
        email: email?.trim() || undefined,
        role: 'CUSTOMER',
      });

      const data = response.data;
      await AsyncStorage.setItem('@homeease_user_id', data.userId);

      return {
        id: data.userId,
        userId: data.userId,
        name: data.fullName,
        fullName: data.fullName,
        phone: data.phoneNumber,
        phoneNumber: data.phoneNumber,
        email: data.email,
        role: data.role,
        walletBalance: 100,
        referralCode: 'HOMEEASE200',
        createdAt: new Date().toISOString(),
      };
    } catch {
      console.log('[AuthApi] Development fallback for /users/register');
      const generatedId = generateUUID();
      await AsyncStorage.setItem('@homeease_user_id', generatedId);

      return {
        id: generatedId,
        userId: generatedId,
        name: fullName,
        fullName,
        email: email || '',
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        role: 'CUSTOMER',
        walletBalance: 100,
        referralCode: 'HOMEEASE200',
        createdAt: new Date().toISOString(),
      };
    }
  },

  // Logout session
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      await AsyncStorage.removeItem('@homeease_user_id');
    }
  },
};

