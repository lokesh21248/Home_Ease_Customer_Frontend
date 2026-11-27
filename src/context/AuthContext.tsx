/**
 * AuthContext — manages JWT token, user session, and auth state.
 * Uses AsyncStorage for persistence across app restarts.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, userApi, AuthResponse, UserProfile, STORAGE_KEYS, isJwtTokenExpired } from '../api/client';
import { queryClient } from '../query/queryClient';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  user: UserProfile | null;
}

interface AuthContextValue extends AuthState {
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<{ isNewUser: boolean; data: AuthResponse }>;
  completeRegistration: (fullName: string, phone: string, email?: string) => Promise<void>;
  bypassLogin: (phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalUser: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    token: null,
    userId: null,
    user: null,
  });


  // Guest browsing can remain public, but booking tracking MUST use a real customer JWT.
  // Never log in as an admin or silently install a demo JWT in production.
  const bypassLogin = useCallback(async (_phone?: string) => {
    throw new Error('A verified customer session is required for booking and live tracking. Please sign in.');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [token, userId, userDataRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
          AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        ]);
        if (!token || token.split('.').length !== 3 || isJwtTokenExpired(token) || !userId) {
          await AsyncStorage.multiRemove([
            STORAGE_KEYS.TOKEN,
            STORAGE_KEYS.USER_ID,
            STORAGE_KEYS.USER_DATA,
          ]);
          setState({ isLoading: false, isAuthenticated: false, token: null, userId: null, user: null });
          return;
        }
        const user: UserProfile | null = userDataRaw ? JSON.parse(userDataRaw) : null;
        setState({ isLoading: false, isAuthenticated: true, token, userId, user });
      } catch {
        setState({ isLoading: false, isAuthenticated: false, token: null, userId: null, user: null });
      }
    })();
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    await authApi.sendOtp(phone);
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, otp: string): Promise<{ isNewUser: boolean; data: AuthResponse }> => {
      const data = await authApi.verifyOtp(phone, otp);

      // Persist token and userId immediately
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token),
        AsyncStorage.setItem(STORAGE_KEYS.USER_ID, data.userId),
      ]);

      // Determine if user needs registration (no name yet)
      const isNewUser = !data.fullName || data.fullName === 'HomeEase User';

      if (!isNewUser) {
        const user: UserProfile = {
          userId: data.userId,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          role: data.role,
          createdAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        setState({
          isLoading: false,
          isAuthenticated: true,
          token: data.token,
          userId: data.userId,
          user,
        });
      }

      return { isNewUser, data };
    },
    [],
  );


  const completeRegistration = useCallback(
    async (fullName: string, phone: string, email?: string) => {
      // Use updateProfile instead of registerProfile, because the user
      // has already been verified via OTP and a token exists in storage.
      const data = await userApi.updateProfile({ fullName, email });
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);

      const user: UserProfile = {
        userId: data.userId || (await AsyncStorage.getItem(STORAGE_KEYS.USER_ID)) || '',
        fullName: data.fullName || fullName,
        phoneNumber: data.phoneNumber || phone,
        email: data.email || email || null,
        role: data.role || 'CUSTOMER',
        createdAt: data.createdAt || new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      setState((s) => ({
        ...s,
        isAuthenticated: true,
        user,
        token: token || s.token,
      }));
    },
    [],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.USER_DATA,
    ]);
    // Clear the entire React Query cache so no private data from this user
    // lingers for a subsequent account login on the same device.
    queryClient.clear();
    setState({
      isLoading: false,
      isAuthenticated: false,
      token: null,
      userId: null,
      user: null,
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const user = await userApi.getProfile();
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      setState((s) => ({ ...s, user }));
    } catch {
      // silently fail
    }
  }, []);

  const updateLocalUser = useCallback((updates: Partial<UserProfile>) => {
    setState((s) => {
      const updatedUser = s.user ? { ...s.user, ...updates } : null;
      if (updatedUser) {
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
      }
      return { ...s, user: updatedUser };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      sendOtp,
      verifyOtp,
      completeRegistration,
      bypassLogin,
      logout,
      refreshProfile,
      updateLocalUser,
    }),
    [state, sendOtp, verifyOtp, completeRegistration, bypassLogin, logout, refreshProfile, updateLocalUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
