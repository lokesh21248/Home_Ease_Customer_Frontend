import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type ProfileScreenNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'ProfileTab'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: ProfileScreenNavProp;
}

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: string;
  isDestructive?: boolean;
}

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, updateUser, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState(user?.fullName || user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [updating, setUpdating] = useState(false);

  const handleOpenEdit = () => {
    setEditFullName(user?.fullName || user?.name || '');
    setEditEmail(user?.email || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      Alert.alert('Validation Error', 'Full name cannot be empty.');
      return;
    }
    setUpdating(true);
    try {
      await updateUser({
        fullName: editFullName.trim(),
        email: editEmail.trim() || undefined,
      });
      setShowEditModal(false);
      Alert.alert('Profile Updated', 'Your profile details have been updated successfully.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      const rootNav = navigation.getParent<StackNavigationProp<RootStackParamList>>();
      if (rootNav) {
        rootNav.reset({
          index: 0,
          routes: [{ name: 'Auth', params: { screen: 'Login' } }],
        });
      } else {
        navigation.navigate('Auth', { screen: 'Login' });
      }
    } finally {
      setLoggingOut(false);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'addresses',
      title: 'My Addresses',
      icon: 'location-outline',
      onPress: () => navigation.navigate('MyAddresses'),
    },
    {
      id: 'bookings',
      title: 'My Bookings',
      icon: 'calendar-outline',
      onPress: () => navigation.navigate('MainTabs', { screen: 'BookingsTab' }),
    },
    {
      id: 'payments',
      title: 'Payments',
      icon: 'card-outline',
      onPress: () => navigation.navigate('PaymentsHistory'),
    },
    {
      id: 'saved',
      title: 'Wishlist',
      icon: 'heart-outline',
      onPress: () => navigation.navigate('SavedServices'),
    },
    {
      id: 'offers',
      title: 'Offers & Coupons',
      icon: 'pricetag-outline',
      badge: '3 New',
      onPress: () => navigation.navigate('OffersCoupons'),
    },
    {
      id: 'refer',
      title: 'Refer & Earn',
      icon: 'gift-outline',
      onPress: () => navigation.navigate('ReferEarn'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'notifications-outline',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      id: 'support',
      title: 'Help & Support',
      icon: 'help-circle-outline',
      onPress: () => navigation.navigate('HelpSupport'),
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'settings-outline',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'logout',
      title: 'Logout',
      icon: 'log-out-outline',
      isDestructive: true,
      onPress: () => setShowLogoutModal(true),
    },
  ];

  return (
    <ScreenWrapper>
      <Header
        title=""
        showBack={false}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsHeaderBtn}
          >
            <Ionicons name="settings-outline" size={20} color={COLORS.primaryDark} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileHeaderCard, SHADOWS.card]}>
          <View style={styles.profileHeaderTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user?.fullName || user?.name || 'Rahul Sharma'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'rahul@gmail.com'}</Text>
              <Text style={styles.userPhone}>{user?.phoneNumber || user?.phone || '+91 98765 43210'}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenEdit}
              style={styles.editProfileBtn}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.primaryDark} />
            </TouchableOpacity>
          </View>

          {/* Quick Wallet Card */}
          <View style={styles.walletBar}>
            <View style={styles.walletLeft}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primaryDark} />
              <Text style={styles.walletLabel}>HomeEase Wallet</Text>
            </View>
            <Text style={styles.walletBalance}>₹{user?.walletBalance ?? 250}</Text>
          </View>
        </View>

        {/* Menu Items List */}
        <View style={[styles.menuContainer, SHADOWS.card]}>
          {menuItems.map((item, index) => {
            const isLast = index === menuItems.length - 1;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={item.onPress}
                style={[styles.menuRow, !isLast && styles.menuRowDivider]}
              >
                <View
                  style={[
                    styles.menuIconBox,
                    item.isDestructive ? styles.menuIconBoxDestructive : undefined,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.isDestructive ? COLORS.error : COLORS.primaryDark}
                  />
                </View>

                <Text
                  style={[
                    styles.menuTitle,
                    item.isDestructive ? styles.menuTitleDestructive : undefined,
                  ]}
                >
                  {item.title}
                </Text>

                {item.badge && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{item.badge}</Text>
                  </View>
                )}

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={item.isDestructive ? COLORS.error : COLORS.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, SHADOWS.card]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.primaryDark} />
              </TouchableOpacity>
            </View>

            <Input
              label="Full Name"
              placeholder="e.g. Rahul Sharma"
              value={editFullName}
              onChangeText={setEditFullName}
              leftIcon={<Ionicons name="person-outline" size={18} color={COLORS.primaryLight} />}
            />

            <Input
              label="Email"
              placeholder="e.g. rahul@gmail.com"
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Ionicons name="mail-outline" size={18} color={COLORS.primaryLight} />}
            />

            <View style={styles.modalActionButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setShowEditModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Changes"
                variant="primary"
                size="md"
                loading={updating}
                onPress={handleSaveProfile}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Dialog matching requirements */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Logout from HomeEase"
        message="Are you sure you want to logout? You will need to verify your phone number to sign back in."
        confirmTitle="Logout"
        cancelTitle="Cancel"
        isDestructive
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xs,
    paddingBottom: 110,
  },
  settingsHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeaderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  walletBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  menuContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50, 100, 80, 0.08)',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(235, 245, 240, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuIconBoxDestructive: {
    backgroundColor: COLORS.errorLight,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primaryDark,
    flex: 1,
  },
  menuTitleDestructive: {
    color: COLORS.error,
  },
  badgePill: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    marginRight: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  profileHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  editProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(235, 245, 240, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.md,
  },
});
