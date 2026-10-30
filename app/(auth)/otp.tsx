/**
 * OTP Verification Screen — Pronto-style "Verify OTP" screen.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { getHeaderTopPadding } from '../../src/constants/layout';
import {
  requestLocationPermission,
  getCurrentLocation,
  reverseGeocodeLocation,
  saveSelectedLocation,
} from '../../src/services/locationService';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, sendOtp, bypassLogin } = useAuth();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (digit && index === OTP_LENGTH - 1) {
      const full = [...newOtp.slice(0, OTP_LENGTH - 1), digit].join('');
      if (full.length === OTP_LENGTH) handleVerify(full);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    setLoading(true);
    try {
      // Direct Login bypass: provisions demo customer session immediately
      await bypassLogin(phone || '+919876543210');
      // Optional background location check
      try {
        const perm = await requestLocationPermission();
        if (perm.granted) {
          const coords = await getCurrentLocation();
          if (coords) {
            const rev = await reverseGeocodeLocation(coords);
            await saveSelectedLocation({ coordinates: coords, address: rev });
          }
        }
      } catch (locErr) {
        console.warn('[OtpScreen] Location detection error:', locErr);
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    try {
      await sendOtp(phone!);
      setOtp(Array(OTP_LENGTH).fill(''));
      setResendTimer(RESEND_SECONDS);
      setError('');
      inputRefs.current[0]?.focus();
    } catch {
      setError('Failed to resend OTP. Try again.');
    } finally {
      setResending(false);
    }
  };

  const maskedPhone = phone ? phone : '';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: getHeaderTopPadding(insets.top, 14) }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            {"We've sent a 6-digit code to\n"}
            <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
          </Text>

          {/* OTP boxes */}
          <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
            {otp.map((digit, i) => (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : null,
                  error ? styles.otpBoxError : null,
                ]}
              >
                <TextInput
                  ref={(r) => { inputRefs.current[i] = r; }}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  caretHidden
                />
                {!digit && <View style={styles.cursor} />}
              </View>
            ))}
          </Animated.View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Resend OTP in </Text>
            {resendTimer > 0 ? (
              <Text style={styles.resendTimer}>00:{String(resendTimer).padStart(2, '0')}</Text>
            ) : null}
          </View>
          {resendTimer === 0 && (
            <Pressable onPress={handleResend} disabled={resending}>
              <Text style={styles.resendLink}>
                {resending ? 'Sending...' : 'Resend OTP'}
              </Text>
            </Pressable>
          )}

          {/* Change Number */}
          <Pressable onPress={() => router.back()} style={styles.changeNumBtn}>
            <Text style={styles.changeNumText}>Change Number</Text>
          </Pressable>

          {/* Verify Button */}
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => handleVerify()}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#1479F8', '#0D63D8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.verifyBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyBtnText}>Direct Login to HomeEase</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  kav: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.xl,
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

  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },

  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['3xl'],
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  phoneHighlight: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },

  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFade2,
  },
  otpBoxError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  otpInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
  },
  cursor: {
    width: 2,
    height: 24,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    textAlign: 'center',
  },

  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  resendLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  resendTimer: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  resendLink: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    textAlign: 'center',
  },
  changeNumBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  changeNumText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },

  verifyBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.md,
    ...Shadows.blue,
  },
  verifyBtnGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: '#FFFFFF',
    letterSpacing: Typography.letterSpacing.wide,
  },
});
