/**
 * Profile Tab — HomeEase user profile screen.
 * Route: /(tabs)/profile
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useWallet } from '../../src/hooks/useWallet';
import { Typography, Shadows } from '../../src/constants/theme';
import { LayoutConstants, getScrollBottomPadding, getHeaderTopPadding } from '../../src/constants/layout';
import { useMyBookings } from '../../src/hooks/useMyBookings';
import { useAddresses } from '../../src/hooks/useAddresses';

const PRIMARY_BLUE = LayoutConstants.BRAND_BLUE;

interface MenuItemProps {
  iconName: any;
  IconComponent: any;
  label: string;
  desc?: string;
  onPress: () => void;
  hideChevron?: boolean;
}

function MenuItem({ iconName, IconComponent, label, desc, onPress, hideChevron }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.menuIconContainer}>
        <IconComponent name={iconName} size={20} color={PRIMARY_BLUE} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuLabel} numberOfLines={1}>{label}</Text>
        {desc ? <Text style={styles.menuDesc} numberOfLines={1}>{desc}</Text> : null}
      </View>
      {!hideChevron && <Feather name="chevron-right" size={18} color="#9CA3AF" />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { balance } = useWallet();

  const { data: bookings = [] } = useMyBookings();
  const { data: addresses = [] } = useAddresses();

  const bookingCount = bookings.length;
  const addressCount = addresses.length;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout from HomeEase?', [
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

  const headerTopPadding = getHeaderTopPadding(insets.top, 10);
  const bottomScrollPadding = getScrollBottomPadding(insets.bottom, 24);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Blue StatusBar filler for seamless background on stretch/bounce */}
      <View style={[styles.topBarFill, { height: insets.top, backgroundColor: PRIMARY_BLUE }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomScrollPadding }}
      >
        {/* ─── Blue Header ─── */}
        <View style={[styles.headerContainer, { paddingTop: headerTopPadding }]}>
          <View style={styles.headerRow}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={34} color={PRIMARY_BLUE} />
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.fullName || 'HomeEase Customer'}
              </Text>
              {user?.phoneNumber ? (
                <Text style={styles.userPhone} numberOfLines={1}>
                  {user.phoneNumber}
                </Text>
              ) : null}
              {user?.email ? (
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
            </View>

            {/* Edit Button */}
            <Pressable
              style={styles.editButton}
              onPress={() => router.push('/profile/edit')}
              accessibilityRole="button"
              accessibilityLabel="Edit Profile"
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── Stats Card (Smooth Overlap) ─── */}
        <View style={styles.statsCardWrapper}>
          <View style={styles.statsCard}>
            <Pressable
              style={styles.statItem}
              onPress={() => router.push('/(tabs)/bookings')}
              accessibilityRole="button"
              accessibilityLabel={`Total Bookings: ${bookingCount}`}
            >
              <Ionicons name="calendar-outline" size={22} color={PRIMARY_BLUE} />
              <Text style={styles.statValue}>{bookingCount}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </Pressable>

            <View style={styles.statDivider} />

            <Pressable
              style={styles.statItem}
              onPress={() => router.push('/(tabs)/wishlist')}
              accessibilityRole="button"
              accessibilityLabel="Wishlist"
            >
              <Ionicons name="heart-outline" size={22} color="#EF4444" />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Wishlist</Text>
            </Pressable>

            <View style={styles.statDivider} />

            <Pressable
              style={styles.statItem}
              onPress={() => router.push('/profile/addresses')}
              accessibilityRole="button"
              accessibilityLabel={`Saved Addresses: ${addressCount}`}
            >
              <Ionicons name="location-outline" size={22} color="#10B981" />
              <Text style={styles.statValue}>{addressCount}</Text>
              <Text style={styles.statLabel}>Addresses</Text>
            </Pressable>

            <View style={styles.statDivider} />

            <Pressable
              style={styles.statItem}
              onPress={() => router.push('/profile/wallet')}
              accessibilityRole="button"
              accessibilityLabel={`Wallet Balance: ₹${balance}`}
            >
              <Ionicons name="wallet-outline" size={22} color="#F59E0B" />
              <Text style={[styles.statValue, { color: PRIMARY_BLUE }]}>
                ₹{balance.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.statLabel}>Wallet</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── HomeEase Wallet Overview Card ─── */}
        <View style={styles.walletCardWrapper}>
          <Pressable
            style={styles.profileWalletCard}
            onPress={() => router.push('/profile/wallet')}
            accessibilityRole="button"
            accessibilityLabel={`Wallet Balance: ₹${balance}`}
          >
            <View style={styles.profileWalletLeft}>
              <View style={styles.profileWalletIconWrap}>
                <Ionicons name="wallet" size={22} color={PRIMARY_BLUE} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.profileWalletTitle}>HomeEase Wallet</Text>
                  <View style={styles.walletActiveBadge}>
                    <Text style={styles.walletActiveText}>Active</Text>
                  </View>
                </View>
                <Text style={styles.profileWalletBalance}>
                  ₹{balance.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.profileWalletSub} numberOfLines={1}>
                  Instant 1-click checkout & cashbacks
                </Text>
              </View>
            </View>
            <View style={styles.profileWalletBtn}>
              <Text style={styles.profileWalletBtnText}>+ Top Up</Text>
            </View>
          </Pressable>
        </View>

        {/* ─── Menu List ─── */}
        <View style={styles.menuContainer}>
          <View style={styles.menuCard}>
            <MenuItem
              IconComponent={Ionicons}
              iconName="calendar-outline"
              label="My Bookings"
              desc="View, track and manage your bookings"
              onPress={() => router.push('/(tabs)/bookings')}
            />
            <MenuItem
              IconComponent={Ionicons}
              iconName="heart-outline"
              label="My Wishlist"
              desc="Saved services and favorites"
              onPress={() => router.push('/(tabs)/wishlist')}
            />
            <MenuItem
              IconComponent={Ionicons}
              iconName="location-outline"
              label="My Addresses"
              desc="Manage service delivery addresses"
              onPress={() => router.push('/profile/addresses')}
            />
            <MenuItem
              IconComponent={Ionicons}
              iconName="card-outline"
              label="Payment Methods"
              desc="Cards, UPI and wallet options"
              onPress={() => router.push('/profile/payments')}
            />

            <View style={styles.menuDivider} />

            <MenuItem
              IconComponent={Ionicons}
              iconName="star-outline"
              label="My Reviews"
              desc="View and manage your service reviews"
              onPress={() => {}}
            />
            <MenuItem
              IconComponent={Ionicons}
              iconName="help-circle-outline"
              label="Help & Support"
              desc="FAQs, chat and contact support"
              onPress={() => router.push('/profile/help')}
            />
            <MenuItem
              IconComponent={Ionicons}
              iconName="settings-outline"
              label="Settings"
              desc="App preferences, notifications and privacy"
              onPress={() => router.push('/profile/settings')}
            />

            <View style={styles.menuDivider} />

            <MenuItem
              IconComponent={Ionicons}
              iconName="document-text-outline"
              label="Terms & Privacy"
              desc="Read terms of service and privacy policy"
              onPress={() => {
                Alert.alert(
                  'Terms & Privacy',
                  'HomeEase is committed to your security and privacy. All customer data and location broadcasts are encrypted end-to-end. Service guarantees protect every confirmed booking with a 30-day warranty.',
                  [{ text: 'Understood', style: 'default' }]
                );
              }}
            />
            <MenuItem
              IconComponent={Ionicons}
              iconName="information-circle-outline"
              label="About HomeEase"
              desc="Version 1.0.0 • On-demand Home Services"
              onPress={() => {
                Alert.alert(
                  'About HomeEase',
                  "HomeEase v1.0.0\n\nIndia's leading on-demand home services marketplace. Built with verified professionals, instant 10-minute dispatch, live GPS tracking, and satisfaction guarantee.\n\n© 2026 HomeEase Technologies Inc.",
                  [{ text: 'Close', style: 'default' }]
                );
              }}
            />
          </View>

          {/* ─── Logout Button ─── */}
          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Log Out"
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  topBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  headerContainer: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    paddingBottom: 36,
    borderBottomLeftRadius: LayoutConstants.HEADER_BORDER_RADIUS + 4,
    borderBottomRightRadius: LayoutConstants.HEADER_BORDER_RADIUS + 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    ...Shadows.sm,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  userName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  userPhone: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  userEmail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  editButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  editButtonText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  // ─── Stats Card ───
  statsCardWrapper: {
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    marginTop: -22,
    zIndex: 10,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
    }),
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#111827',
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10.5,
    color: '#6B7280',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F3F4F6',
  },

  // ─── Profile Wallet Card ───
  walletCardWrapper: {
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    marginTop: 14,
  },
  profileWalletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    ...Shadows.sm,
  },
  profileWalletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  profileWalletIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileWalletTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#111827',
  },
  walletActiveBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  walletActiveText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 10,
    color: '#059669',
  },
  profileWalletBalance: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: PRIMARY_BLUE,
    marginTop: 2,
  },
  profileWalletSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  profileWalletBtn: {
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  profileWalletBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  // ─── Menu ───
  menuContainer: {
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    marginTop: 14,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuItemPressed: {
    backgroundColor: '#F9FAFB',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  menuLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: '#111827',
  },
  menuDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 14,
    marginVertical: 4,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    paddingVertical: 13,
    backgroundColor: '#FEF2F2',
  },
  logoutButtonPressed: {
    backgroundColor: '#FEE2E2',
  },
  logoutButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14.5,
    color: '#DC2626',
  },
});
