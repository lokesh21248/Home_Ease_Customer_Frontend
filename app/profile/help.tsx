/**
 * Help & Support Screen — Pronto-style Help & Support matching Screen 14.
 * Route: /profile/help
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

interface HelpItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

const HELP_ITEMS: HelpItem[] = [
  {
    id: 'faqs',
    title: 'FAQs',
    desc: 'Find answers to common questions',
    icon: '❓',
  },
  {
    id: 'contact',
    title: 'Contact Us',
    desc: 'Phone, Email, Live Chat',
    icon: '📞',
  },
  {
    id: 'complaint',
    title: 'Raise a Complaint',
    desc: 'Tell us about your issue',
    icon: '💬',
  },
  {
    id: 'service-policy',
    title: 'Service Policy',
    desc: 'Cancellation, Refund & Reschedule',
    icon: '📄',
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    desc: 'Read our terms',
    icon: '📜',
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    desc: 'Learn how we protect your data',
    icon: '🛡️',
  },
];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();

  const handlePress = (item: HelpItem) => {
    Alert.alert(item.title, item.desc);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {HELP_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => handlePress(item)}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
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

  list: {
    padding: Spacing.base,
    gap: 12,
    paddingBottom: 40,
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
  desc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  chevron: {
    fontSize: 22,
    color: Colors.textMuted,
  },
});
