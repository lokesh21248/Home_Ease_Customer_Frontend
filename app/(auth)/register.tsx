/**
 * Register Screen — Pronto-style "Create Account" screen.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { completeRegistration, bypassLogin } = useAuth();

  const [form, setForm] = useState({ fullName: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const [agree, setAgree] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      e.fullName = 'Please enter your full name (min 2 chars)';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Please enter a valid email address';
    }
    if (!agree) {
      e.agree = 'Please agree to Terms & Privacy Policy';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const name = form.fullName.trim() || 'HomeEase Customer';
      try {
        await completeRegistration(name, phone || '+919876543210', form.email.trim() || undefined);
      } catch {
        await bypassLogin(phone || '+919876543210');
      }
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
        console.warn('[RegisterScreen] Location detection error:', locErr);
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      await bypassLogin(phone || '+919876543210');
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'fullName', label: 'Full Name', placeholder: 'Lokesh Reddy', icon: '👤' },
    { key: 'email', label: 'Email Address', placeholder: 'lokeshreddy@gmail.com', icon: '✉️', keyboardType: 'email-address' as any },
    { key: 'phone', label: 'Phone Number', placeholder: phone || '+91 98765 43210', icon: '📱', editable: false },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(insets.bottom, 24) + 16 },
          ]}
        >

          {/* Header */}
          <View style={[styles.header, { paddingTop: getHeaderTopPadding(insets.top, 14) }]}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
          </View>

          {/* Title */}
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join HomeEase to book home services</Text>

          {/* Form */}
          <View style={styles.form}>
            {fields.map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={styles.label}>{field.label}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focused === field.key && styles.inputFocused,
                    errors[field.key] ? styles.inputError : null,
                  ]}
                >
                  <Text style={styles.fieldIcon}>{field.icon}</Text>
                  <TextInput
                    style={styles.input}
                    value={field.key === 'phone' ? (phone || '') : form[field.key as keyof typeof form]}
                    editable={field.editable !== false}
                    onChangeText={(t) => {
                      if (field.key === 'phone') return;
                      setForm((f) => ({ ...f, [field.key]: t }));
                      setErrors((e) => ({ ...e, [field.key]: '' }));
                    }}
                    placeholder={field.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType={field.keyboardType || 'default'}
                    autoCapitalize={field.key === 'email' ? 'none' : 'words'}
                    onFocus={() => setFocused(field.key)}
                    onBlur={() => setFocused('')}
                  />
                </View>
                {errors[field.key] ? (
                  <Text style={styles.errorText}>{errors[field.key]}</Text>
                ) : null}
              </View>
            ))}

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, focused === 'password' && styles.inputFocused]}>
                <Text style={styles.fieldIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                />
              </View>
            </View>

            {/* Terms */}
            <Pressable style={styles.agreeRow} onPress={() => setAgree(!agree)}>
              <View style={[styles.checkbox, agree && styles.checkboxActive]}>
                {agree && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.agreeText}>
                I agree to{' '}
                <Text style={styles.agreeLink}>Terms & Conditions and Privacy Policy</Text>
              </Text>
            </Pressable>
            {errors.agree ? <Text style={styles.errorText}>{errors.agree}</Text> : null}
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#1479F8', '#0D63D8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.registerBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.replace('/(auth)/phone')}>
              <Text style={styles.footerLink}>Login</Text>
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

  header: { marginBottom: Spacing.lg },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  backIcon: { fontSize: 26, color: Colors.textPrimary, lineHeight: 30 },

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
    marginBottom: Spacing.xl,
  },

  form: { gap: Spacing.md },
  fieldGroup: { gap: 6 },
  label: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    gap: 10,
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFade2,
  },
  inputError: { borderColor: Colors.error },
  fieldIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    marginLeft: 4,
  },

  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: Colors.surfaceLight,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  agreeText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  agreeLink: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.medium,
  },

  registerBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.xl,
    ...Shadows.blue,
  },
  registerBtnGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: '#FFFFFF',
    letterSpacing: Typography.letterSpacing.wide,
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
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
