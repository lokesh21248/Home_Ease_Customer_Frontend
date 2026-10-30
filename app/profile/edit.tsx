/**
 * Edit Profile Screen — Pronto-style Edit Profile matching Screen 11.
 * Route: /profile/edit
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { userApi } from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateLocalUser } = useAuth();

  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    dob: '',
  });
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await userApi.updateProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
      });
      updateLocalUser(updated);
      Alert.alert('Saved', 'Profile updated successfully!');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Avatar with Camera Badge */}
          <View style={styles.avatarWrap}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
              }}
              style={styles.avatarImg}
              contentFit="cover"
            />
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View
              style={[
                styles.inputWrapper,
                focused === 'name' && styles.inputWrapperFocused,
              ]}
            >
              <TextInput
                style={styles.input}
                value={form.fullName}
                onChangeText={(t) => setForm({ ...form, fullName: t })}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused('')}
                placeholder="Full Name"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View
              style={[
                styles.inputWrapper,
                focused === 'email' && styles.inputWrapperFocused,
              ]}
            >
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={(t) => setForm({ ...form, email: t })}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Email Address"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={[styles.inputWrapper, styles.inputWrapperDisabled]}>
              <Text style={styles.flag}>🇮🇳</Text>
              <TextInput
                style={[styles.input, { color: Colors.textSecondary }]}
                value={form.phone}
                editable={false}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            <View
              style={[
                styles.inputWrapper,
                focused === 'dob' && styles.inputWrapperFocused,
              ]}
            >
              <TextInput
                style={styles.input}
                value={form.dob}
                onChangeText={(t) => setForm({ ...form, dob: t })}
                onFocus={() => setFocused('dob')}
                onBlur={() => setFocused('')}
                placeholder="Date of Birth"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 26,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  headerRightPlaceholder: {
    width: 36,
  },

  scroll: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
    paddingBottom: 100,
    gap: 16,
  },

  avatarWrap: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E5E7EB',
    borderWidth: 3,
    borderColor: '#0066FF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraIcon: {
    fontSize: 14,
  },

  formGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  inputWrapperFocused: {
    borderColor: '#0066FF',
    backgroundColor: '#FFFFFF',
  },
  inputWrapperDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  flag: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    ...Shadows.md,
  },
  saveBtn: {
    height: 52,
    backgroundColor: '#0066FF',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.blue,
  },
  saveBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: '#FFFFFF',
  },
});
