import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { firebaseAuth } from '../services/firebaseAuth';
import { firebaseFCM } from '../services/firebaseFCM';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  verificationPhone: string;
  verificationId: string;
  sendOtp: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (otp: string) => Promise<{ success: boolean; isNewUser: boolean }>;
  register: (name: string, email?: string) => Promise<boolean>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [verificationPhone, setVerificationPhone] = useState<string>('');
  const [verificationId, setVerificationId] = useState<string>('');

  const bootstrapAuth = async () => {
    try {
      setIsLoading(true);
      const savedToken = await AsyncStorage.getItem('@homeease_auth_token');
      const savedUserJson = await AsyncStorage.getItem('@homeease_user');

      if (savedToken && savedUserJson) {
        setToken(savedToken);
        setUser(JSON.parse(savedUserJson));
        // Initialize FCM in background
        firebaseFCM.init();
      }
    } catch (e) {
      console.warn('Bootstrap auth error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const sendOtp = async (phone: string) => {
    setVerificationPhone(phone);
    // Trigger Firebase phone auth
    const session = await firebaseAuth.sendOtp(phone);
    setVerificationId(session.verificationId);
    // Also notify API bridge
    const res = await authApi.sendOtp(phone);
    return {
      success: true,
      message: res.message || 'OTP sent successfully',
    };
  };

  const verifyOtp = async (otp: string) => {
    // Verify with Firebase
    await firebaseAuth.verifyOtp(otp);
    // Verify with Backend
    const res = await authApi.verifyOtp({
      phone: verificationPhone,
      otp,
      verificationId,
    });

    if (res.token) {
      setToken(res.token);
      await AsyncStorage.setItem('@homeease_auth_token', res.token);
    }
    const uId = res.user?.userId || res.user?.id;
    if (uId) {
      await AsyncStorage.setItem('@homeease_user_id', uId);
    }

    if (res.isNewUser) {
      // User must fill name in CreateAccountScreen
      setUser(res.user);
      await AsyncStorage.setItem('@homeease_user', JSON.stringify(res.user));
      return { success: true, isNewUser: true };
    }

    setUser(res.user);
    await AsyncStorage.setItem('@homeease_user', JSON.stringify(res.user));
    firebaseFCM.init();

    return { success: true, isNewUser: false };
  };

  const register = async (name: string, email?: string) => {
    try {
      // Update profile on backend: PUT /user/profile
      const updated = await userApi.updateProfile({
        fullName: name.trim(),
        email: email?.trim(),
      });
      setUser(updated);
      await AsyncStorage.setItem('@homeease_user', JSON.stringify(updated));
    } catch {
      // Fallback
      const newUser = await authApi.registerUser(name, email, verificationPhone);
      setUser(newUser);
      await AsyncStorage.setItem('@homeease_user', JSON.stringify(newUser));
    }
    firebaseFCM.init();
    return true;
  };

  const updateUser = async (updates: Partial<User>) => {
    const updated = await userApi.updateProfile(updates);
    setUser(updated);
    await AsyncStorage.setItem('@homeease_user', JSON.stringify(updated));
  };

  const logout = async () => {
    try {
      await authApi.logout();
      await firebaseAuth.signOut();
      await AsyncStorage.removeItem('@homeease_auth_token');
      await AsyncStorage.removeItem('@homeease_user');
      await AsyncStorage.removeItem('@homeease_user_id');
      setUser(null);
      setToken(null);
    } catch (e) {
      console.warn('Logout error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        verificationPhone,
        verificationId,
        sendOtp,
        verifyOtp,
        register,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
