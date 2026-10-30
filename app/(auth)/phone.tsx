/**
 * Phone Entry Screen — Pronto-style "Login to Pronto" screen.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { getHeaderTopPadding } from '../../src/constants/layout';

const COUNTRY_CODE = '+91';

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const { sendOtp, bypassLogin } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validate = (): boolean => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      shake();
      return false;
    }
    setError('');
    return true;
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const fullPhone = phone.trim() ? `${COUNTRY_CODE}${phone.replace(/\D/g, '')}` : '+919876543210';
      await bypassLogin(fullPhone);
      router.replace('/(tabs)');
    } catch {
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectLogin = async () => {
    setLoading(true);
    try {
      await bypassLogin('+919876543210');
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const isValid = phone.replace(/\D/g, '').length === 10;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: getHeaderTopPadding(insets.top, 14) }]}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
          </View>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Login to HomeEase</Text>
            <Text style={styles.subtitle}>Enter your phone number to continue</Text>
          </View>

          {/* Phone input box */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <Pressable
              style={[
                styles.inputWrapper,
                focused && styles.inputWrapperFocused,
                !!error && styles.inputWrapperError,
              ]}
              onPress={() => inputRef.current?.focus()}
            >
              {/* Country flag + code */}
              <View style={styles.countryChip}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.countryCode}>{COUNTRY_CODE}</Text>
              </View>
              <View style={styles.dividerLine} />
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={phone}
                onChangeText={(t) => {
                  setPhone(t.replace(/\D/g, '').slice(0, 10));
                  setError('');
                }}
                keyboardType="phone-pad"
                placeholder="98765 43210"
                placeholderTextColor={Colors.textMuted}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
                maxLength={10}
              />
            </Pressable>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </Animated.View>

          {/* Direct Login Button */}
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSendOtp}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#2563EB', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>
                  Direct Login to Pronto
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or continue with</Text>
            <View style={styles.orLine} />
          </View>

          {/* Social buttons */}
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} onPress={handleDirectLogin}>
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialText}>Continue with Google (Direct Login)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} onPress={handleDirectLogin}>
            <Text style={styles.socialIconEmail}>✉</Text>
            <Text style={styles.socialText}>Continue with Guest Account</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to Pronto? </Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>Create Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  kav: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },

  header: {
    paddingTop: 0,
    marginBottom: Spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  backIcon: {
    fontSize: 26,
    color: Colors.textPrimary,
    lineHeight: 30,
  },

  titleBlock: { marginBottom: Spacing.xl },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['3xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFade2,
  },
  inputWrapperError: {
    borderColor: Colors.error,
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: Spacing.md,
  },
  flag: { fontSize: 20 },
  countryCode: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  dividerLine: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.wide,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },

  sendBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadows.blue,
  },
  sendBtnGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: '#FFFFFF',
    letterSpacing: Typography.letterSpacing.wide,
  },
  sendBtnTextDisabled: {
    color: Colors.textMuted,
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  orText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },

  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    ...Shadows.xs,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EA4335',
  },
  socialIconEmail: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  socialText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
});
