/**
 * Settings Screen — Pronto-style Settings matching Screen 15.
 * Route: /profile/settings
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [location, setLocation] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with White Safe Area Fill */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}
      >
        {/* Language */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => Alert.alert('Language', 'Current language is English.')}
        >
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🌐</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.title}>Language</Text>
            <Text style={styles.subText}>English</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* Notifications */}
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🔔</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subText}>{notifications ? 'On' : 'Off'}</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
            thumbColor={notifications ? Colors.primary : '#FFFFFF'}
          />
        </View>

        {/* Location */}
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>📍</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.title}>Location</Text>
            <Text style={styles.subText}>{location ? 'On' : 'Off'}</Text>
          </View>
          <Switch
            value={location}
            onValueChange={setLocation}
            trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
            thumbColor={location ? Colors.primary : '#FFFFFF'}
          />
        </View>

        {/* Dark Mode */}
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🌙</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.title}>Dark Mode</Text>
            <Text style={styles.subText}>{darkMode ? 'On' : 'Off'}</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
            thumbColor={darkMode ? Colors.primary : '#FFFFFF'}
          />
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [styles.logoutCard, pressed && styles.cardPressed]}
          onPress={handleLogout}
        >
          <View style={styles.logoutIconWrap}>
            <Text style={styles.logoutIcon}>🚪</Text>
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
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

  list: {
    padding: Spacing.base,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#ECEFF3',
    ...Shadows.sm,
    gap: 14,
  },
  cardPressed: {
    backgroundColor: '#F8FAFF',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  subText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  chevron: {
    fontSize: 22,
    color: Colors.textMuted,
  },

  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    ...Shadows.sm,
    gap: 14,
    marginTop: 10,
  },
  logoutIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    fontSize: 20,
  },
  logoutText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: '#EF4444',
  },
});
