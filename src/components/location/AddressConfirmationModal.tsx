/**
 * AddressConfirmationModal
 * Displays the detected or selected address and its live serviceability status
 * verified directly against the Spring Boot PostgreSQL serviceability table.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { MapPin, CheckCircle2, AlertTriangle, X, ArrowRight, Edit3 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useUserLocation } from '../../hooks/useUserLocation';
import { Colors, Typography } from '../../constants/theme';

interface AddressConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onSelectManual?: () => void;
}

export const AddressConfirmationModal: React.FC<AddressConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  onSelectManual,
}) => {
  const { address, serviceability, checkingServiceability, confirmLocation } = useUserLocation();

  const handleConfirm = async () => {
    await confirmLocation();
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleManual = () => {
    onClose();
    if (onSelectManual) {
      onSelectManual();
    } else {
      router.push('/location/select');
    }
  };

  const isServiceable = serviceability?.serviceable === true;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.pinCircle}>
                <MapPin size={20} color={Colors.primary} />
              </View>
              <Text style={styles.headerTitle}>Confirm Delivery Location</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={18} color="#6B7280" />
            </Pressable>
          </View>

          {/* Address Box */}
          <View style={styles.addressBox}>
            <Text style={styles.shortAddress}>
              {address?.shortAddress || address?.area || 'Detected Location'}
            </Text>
            <Text style={styles.fullAddress}>
              {address?.fullAddress || address?.addressLine || 'Address details being retrieved...'}
            </Text>
            {address?.pincode ? (
              <View style={styles.pincodeTag}>
                <Text style={styles.pincodeText}>PIN: {address.pincode}</Text>
              </View>
            ) : null}
          </View>

          {/* Serviceability Banner */}
          <View style={styles.statusSection}>
            {checkingServiceability ? (
              <View style={[styles.statusBanner, styles.statusBannerLoading]}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.statusLoadingText}>
                  Checking service availability in your area...
                </Text>
              </View>
            ) : isServiceable ? (
              <View style={[styles.statusBanner, styles.statusBannerSuccess]}>
                <CheckCircle2 size={18} color="#059669" />
                <View style={styles.statusTextCol}>
                  <Text style={styles.statusSuccessTitle}>Available at your doorstep</Text>
                  <Text style={styles.statusSuccessSub}>
                    Verified for FirstDoor doorstep services in {serviceability?.city || 'Hyderabad'}.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.statusBanner, styles.statusBannerWarning]}>
                <AlertTriangle size={18} color="#DC2626" />
                <View style={styles.statusTextCol}>
                  <Text style={styles.statusWarningTitle}>Location Not Serviceable</Text>
                  <Text style={styles.statusWarningSub}>
                    {serviceability?.message ||
                      'We do not currently operate in this PIN code. Bookings outside supported areas are not allowed.'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[
                styles.confirmBtn,
                (!isServiceable || checkingServiceability) && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!isServiceable || checkingServiceability}
              accessibilityRole="button"
              accessibilityLabel="Confirm and Deliver Here"
            >
              <Text style={styles.confirmBtnText}>Confirm & Deliver Here</Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.manualBtn}
              onPress={handleManual}
              accessibilityRole="button"
              accessibilityLabel="Select Another Address"
            >
              <Edit3 size={15} color="#4B5563" />
              <Text style={styles.manualBtnText}>Change / Select Another Location</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
  },
  addressBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  shortAddress: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
  },
  fullAddress: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  pincodeTag: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pincodeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11,
    color: Colors.primary,
  },
  statusSection: {
    marginBottom: 18,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  statusBannerLoading: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  statusLoadingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: '#4B5563',
  },
  statusBannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusTextCol: {
    flex: 1,
  },
  statusSuccessTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#065F46',
  },
  statusSuccessSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  statusBannerWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusWarningTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#991B1B',
  },
  statusWarningSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 1,
  },
  actions: {
    gap: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  confirmBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 11,
    borderRadius: 14,
    gap: 6,
  },
  manualBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: '#4B5563',
  },
});

export default AddressConfirmationModal;
