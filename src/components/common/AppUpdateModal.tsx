import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppUpdateCheckResponse } from '../../api/client';
import { Colors, Typography, BorderRadius, Shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface AppUpdateModalProps {
  visible: boolean;
  updateInfo: AppUpdateCheckResponse | null;
  onDismiss?: () => void;
}

export function AppUpdateModal({ visible, updateInfo, onDismiss }: AppUpdateModalProps) {
  if (!updateInfo || !visible) return null;

  const isForceUpdate = Boolean(updateInfo.forceUpdate);

  const handleUpdateNow = async () => {
    const url =
      updateInfo.storeUrl ||
      (Platform.OS === 'ios'
        ? 'https://apps.apple.com'
        : 'https://play.google.com/store/apps');

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.warn('[AppUpdateModal] Could not open store URL:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Non-dismissible if forceUpdate is true
      onRequestClose={() => {
        if (!isForceUpdate && onDismiss) {
          onDismiss();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon Badge */}
          <View style={[styles.iconContainer, isForceUpdate ? styles.iconForce : styles.iconOptional]}>
            <Ionicons
              name={isForceUpdate ? 'alert-circle' : 'cloud-download-outline'}
              size={36}
              color={isForceUpdate ? '#DC2626' : Colors.primary}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isForceUpdate ? 'App Update Required' : 'New Update Available'}
          </Text>

          {/* Version Tag */}
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>
              v{updateInfo.latestVersion || 'Latest'}
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.message}>
            {updateInfo.releaseNotes ||
              (isForceUpdate
                ? 'A critical update is required to continue using FirstDoor. Please update to the latest version to ensure smooth booking and real-time live tracking.'
                : 'A new version of FirstDoor is available with performance improvements and new features.')}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.updateButton}
              activeOpacity={0.85}
              onPress={handleUpdateNow}
            >
              <Ionicons name="arrow-down-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.updateButtonText}>Update Now</Text>
            </TouchableOpacity>

            {!isForceUpdate && onDismiss && (
              <TouchableOpacity
                style={styles.laterButton}
                activeOpacity={0.7}
                onPress={onDismiss}
              >
                <Text style={styles.laterButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: Math.min(width - 48, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: 28,
    alignItems: 'center',
    ...Shadows.card,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconForce: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  iconOptional: {
    backgroundColor: 'rgba(20, 121, 248, 0.12)',
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  versionBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  versionText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
  },
  message: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  updateButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Typography.fontFamily.semiBold,
  },
  laterButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  laterButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
  },
});
