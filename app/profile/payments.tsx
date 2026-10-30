/**
 * Payment Methods Screen — Pronto-style Payment Methods matching Screen 13.
 * Route: /profile/payments
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useWallet } from '../../src/hooks/useWallet';

interface PaymentOption {
  id: string;
  name: string;
  desc: string;
  icon: string;
  iconBg: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'wallet',
    name: 'HomeEase Wallet',
    desc: 'Instant 1-click checkout & refunds',
    icon: '👛',
    iconBg: '#EFF6FF',
  },
  {
    id: 'upi',
    name: 'UPI',
    desc: 'Manage your UPI',
    icon: '📱',
    iconBg: '#EFF6FF',
  },
  {
    id: 'card',
    name: 'Credit / Debit Card',
    desc: 'Add or manage cards',
    icon: '💳',
    iconBg: '#F0FDF4',
  },
  {
    id: 'netbanking',
    name: 'Net Banking',
    desc: 'Add bank account',
    icon: '🏦',
    iconBg: '#FFF7ED',
  },
  {
    id: 'cod',
    name: 'Cash on Delivery',
    desc: 'Pay at your doorstep',
    icon: '💵',
    iconBg: '#FAF5FF',
  },
];

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const { balance } = useWallet();

  const handleSelect = (option: PaymentOption) => {
    if (option.id === 'wallet') {
      router.push('/profile/wallet');
      return;
    }
    Alert.alert(option.name, `${option.desc} functionality is active.`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={styles.list}>
        {PAYMENT_OPTIONS.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleSelect(item)}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <View style={styles.infoCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.id === 'wallet' && (
                  <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                    <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: 11, color: '#059669' }}>
                      ₹{balance.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
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
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  name: {
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
