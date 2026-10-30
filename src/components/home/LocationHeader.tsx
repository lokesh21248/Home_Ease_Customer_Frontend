import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MapPin, ChevronDown, Bell, AlertCircle, Wallet, Check } from 'lucide-react-native';
import { HomeColors } from './types';
import { Typography } from '../../constants/theme';
import { useUserLocation } from '../../hooks/useUserLocation';
import { useWallet } from '../../hooks/useWallet';
import { AddressConfirmationModal } from '../location/AddressConfirmationModal';

interface LocationHeaderProps {
  city?: string;
  area?: string;
  userInitial?: string;
  hasUnreadNotifications?: boolean;
  onLocationPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export function LocationHeader({
  city: propCity,
  area: propArea,
  userInitial = 'E',
  hasUnreadNotifications = true,
  onLocationPress,
  onNotificationPress,
  onProfilePress,
}: LocationHeaderProps) {
  const {
    address,
    loading,
    permissionDenied,
    error,
    refreshLocation,
    serviceability,
    checkingServiceability,
  } = useUserLocation();
  const { balance } = useWallet();
  const [modalVisible, setModalVisible] = useState(false);

  // Determine address to display
  let displayAddress = '';
  if (address?.formattedAddress) {
    displayAddress = address.formattedAddress;
  } else if (address?.area && address?.city) {
    displayAddress = `${address.area}, ${address.city}`;
  } else if (address?.shortAddress) {
    displayAddress = address.shortAddress;
  } else if (propArea && propCity) {
    displayAddress = `${propArea}, ${propCity}`;
  }

  const handleCardPress = () => {
    if (onLocationPress) {
      onLocationPress();
    } else {
      setModalVisible(true);
    }
  };

  const handleEnableLocation = async (e: any) => {
    e?.stopPropagation?.();
    await refreshLocation(true);
  };

  const handleTryAgain = async (e: any) => {
    e?.stopPropagation?.();
    await refreshLocation(true);
  };

  const isServiceable = serviceability?.serviceable === true;
  const isUnserviceable = serviceability && serviceability.serviceable === false;

  return (
    <View style={styles.container}>
      {/* Top Branding / User Profile & Notification Row */}
      <View style={styles.topBar}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>FirstDoor</Text>
        </View>

        <View style={styles.actionsContainer}>
          {/* Wallet Feature */}
          <Pressable
            style={styles.walletPill}
            onPress={() => router.push('/profile/wallet')}
            accessibilityRole="button"
            accessibilityLabel={`Wallet: ₹${balance}`}
          >
            <Wallet size={15} color="#FFFFFF" />
            <Text style={styles.walletText}>₹{balance.toLocaleString('en-IN')}</Text>
          </Pressable>

          <Pressable
            style={styles.notificationButton}
            onPress={onNotificationPress}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color="#FFFFFF" />
            {hasUnreadNotifications && <View style={styles.notificationDot} />}
          </Pressable>

          <Pressable
            style={styles.avatarButton}
            onPress={onProfilePress}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Location Card */}
      <Pressable
        style={styles.locationCard}
        onPress={handleCardPress}
        accessibilityRole="button"
        accessibilityLabel={`Your location: ${displayAddress || 'Tap to select location'}`}
      >
        {loading ? (
          <View style={styles.statusRow}>
            <View style={styles.iconBox}>
              <ActivityIndicator size="small" color={HomeColors.primaryBlue} />
            </View>
            <View style={styles.textColumn}>
              <Text style={styles.labelDetecting}>Detecting your location...</Text>
              <Text style={styles.subDetecting}>Using GPS</Text>
            </View>
          </View>
        ) : permissionDenied ? (
          <View style={styles.statusRow}>
            <View style={[styles.iconBox, styles.iconBoxWarning]}>
              <AlertCircle size={18} color="#D97706" />
            </View>
            <View style={styles.textColumn}>
              <Text style={styles.errorTitle}>Location access is turned off</Text>
              <Text style={styles.errorSubtitle}>Required to detect address</Text>
            </View>
            <Pressable
              style={styles.actionBtn}
              onPress={handleEnableLocation}
              accessibilityRole="button"
              accessibilityLabel="Enable Location"
            >
              <Text style={styles.actionBtnText}>Enable Location</Text>
            </Pressable>
          </View>
        ) : error ? (
          <View style={styles.statusRow}>
            <View style={[styles.iconBox, styles.iconBoxError]}>
              <AlertCircle size={18} color="#EF4444" />
            </View>
            <View style={styles.textColumn}>
              <Text style={styles.errorTitle}>Unable to detect your location</Text>
              <Text style={styles.errorSubtitle}>Tap to select or retry</Text>
            </View>
            <Pressable
              style={styles.actionBtn}
              onPress={handleTryAgain}
              accessibilityRole="button"
              accessibilityLabel="Try Again"
            >
              <Text style={styles.actionBtnText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cardContent}>
            <View style={styles.leftSection}>
              <View style={styles.pinCircle}>
                <MapPin size={18} color={HomeColors.primaryBlue} />
              </View>
              <View style={styles.locationDetails}>
                <View style={styles.labelRow}>
                  <Text style={styles.yourLocationLabel}>Your location</Text>
                  {checkingServiceability ? (
                    <View style={styles.statusPillChecking}>
                      <ActivityIndicator size={10} color="#6B7280" />
                      <Text style={styles.statusPillCheckingText}>Checking...</Text>
                    </View>
                  ) : isServiceable ? (
                    <View style={styles.statusPillServiceable}>
                      <View style={styles.greenDot} />
                      <Text style={styles.statusPillServiceableText}>Available</Text>
                    </View>
                  ) : isUnserviceable ? (
                    <View style={styles.statusPillUnserviceable}>
                      <View style={styles.redDot} />
                      <Text style={styles.statusPillUnserviceableText}>Not Available</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.addressText} numberOfLines={1}>
                  {displayAddress || 'Select location'}
                </Text>
              </View>
            </View>

            <View style={styles.chevronWrapper}>
              <ChevronDown size={18} color="#6B7280" strokeWidth={2.2} />
            </View>
          </View>
        )}
      </Pressable>

      <AddressConfirmationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectManual={() => {
          setModalVisible(false);
          router.push('/location/select');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: 21,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HomeColors.translucentWhite,
    paddingHorizontal: 8,
    height: 36,
    borderRadius: 18,
    gap: 4,
  },
  walletText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: HomeColors.translucentWhite,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: HomeColors.notificationRed,
    borderWidth: 1.5,
    borderColor: HomeColors.primaryBlue,
  },
  avatarButton: {
    borderRadius: 18,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: HomeColors.primaryBlue,
  },

  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  pinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  yourLocationLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#6B7280',
    letterSpacing: 0.1,
  },
  statusPillChecking: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 4,
  },
  statusPillCheckingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: '#6B7280',
  },
  statusPillServiceable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusPillServiceableText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: '#059669',
  },
  statusPillUnserviceable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 4,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  statusPillUnserviceableText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: '#DC2626',
  },
  addressText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#111827',
    letterSpacing: -0.2,
  },
  chevronWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconBoxWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  iconBoxError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  labelDetecting: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: '#111827',
  },
  subDetecting: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
  },
  errorTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: '#111827',
  },
  errorSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#6B7280',
  },
  actionBtn: {
    backgroundColor: HomeColors.primaryBlue,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
});
