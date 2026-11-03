import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMapView } from '../components/map/GoogleMapView';
import { useCustomerTracking } from '../hooks/useCustomerTracking';
import { useBookingStatus, BookingStage } from '../hooks/useBookingStatus';
import { Colors, Typography } from '../constants/theme';
import { BASE_URL } from '../api/client';

export interface ActiveJobScreenProps {
  bookingId: string;
  customerToken?: string;
  customerLocation: {
    latitude: number;
    longitude: number;
  };
  onBackPress?: () => void;
}

// ── Status display helpers ─────────────────────────────────────────────────────

type StatusConfig = {
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  showSpinner?: boolean;
};

function getStatusConfig(status: BookingStage, workerName?: string): StatusConfig {
  switch (status) {
    case 'PENDING':
    case 'REQUESTED':
      return {
        icon: 'hourglass-outline',
        color: '#F59E0B',
        title: 'Confirming Your Booking',
        subtitle: 'Your request is being processed…',
        showSpinner: true,
      };
    case 'SEARCHING':
      return {
        icon: 'search-outline',
        color: '#3B82F6',
        title: 'Finding Nearby Partner',
        subtitle: 'Searching for the best service partner in your area…',
        showSpinner: true,
      };
    case 'ACCEPTED':
      return {
        icon: 'checkmark-circle-outline',
        color: '#10B981',
        title: 'Partner Assigned!',
        subtitle: `${workerName ?? 'Your partner'} has accepted and is preparing to arrive.`,
      };
    case 'ON_THE_WAY':
      return {
        icon: 'navigate-outline',
        color: '#6366F1',
        title: 'Partner On The Way',
        subtitle: `${workerName ?? 'Your partner'} is en route to your location.`,
      };
    case 'ARRIVED':
      return {
        icon: 'pin-outline',
        color: '#8B5CF6',
        title: 'Partner Has Arrived',
        subtitle: 'Please share your PIN with the partner to begin the service.',
      };
    case 'IN_PROGRESS':
      return {
        icon: 'construct-outline',
        color: '#2563EB',
        title: 'Service In Progress',
        subtitle: 'Your service partner is currently working at your location.',
      };
    case 'COMPLETED':
      return {
        icon: 'checkmark-done-circle-outline',
        color: '#10B981',
        title: 'Service Completed!',
        subtitle: 'Your booking has been completed successfully. Thank you!',
      };
    case 'CANCELLED':
      return {
        icon: 'close-circle-outline',
        color: '#EF4444',
        title: 'Booking Cancelled',
        subtitle: 'This booking has been cancelled.',
      };
    case 'WORKER_NOT_FOUND':
      return {
        icon: 'alert-circle-outline',
        color: '#EF4444',
        title: 'No Partner Nearby',
        subtitle:
          'We could not find an available service partner in your area right now. Please try again shortly.',
      };
    default:
      return {
        icon: 'ellipsis-horizontal-circle-outline',
        color: '#94A3B8',
        title: 'Connecting…',
        subtitle: 'Fetching your booking status…',
        showSpinner: true,
      };
  }
}

// ── Retry matching: calls dispatch retry for the same booking ─────────────────

async function retryMatchingForBooking(
  bookingId: string,
  token?: string
): Promise<void> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // POST /api/v1/bookings/{id}/retry-dispatch — triggers re-dispatch on the same booking
    await fetch(`${BASE_URL}/bookings/${bookingId}/retry-dispatch`, {
      method: 'POST',
      headers,
    });
  } catch {
    // ignore — user will see updated status on next poll
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActiveJobScreen({
  bookingId,
  customerToken,
  customerLocation,
  onBackPress,
}: ActiveJobScreenProps) {
  const { provider } = useCustomerTracking(bookingId, customerToken);
  const { data: bookingStatus, loading, error: statusError } = useBookingStatus(
    bookingId,
    customerToken
  );

  const currentStatus = bookingStatus?.status ?? null;
  const config = getStatusConfig(currentStatus, bookingStatus?.workerName ?? undefined);

  const handleRetryMatching = useCallback(() => {
    if (bookingId) {
      void retryMatchingForBooking(bookingId, customerToken);
    }
  }, [bookingId, customerToken]);

  const isTerminal =
    currentStatus === 'COMPLETED' ||
    currentStatus === 'CANCELLED';

  const showMap =
    currentStatus === 'ON_THE_WAY' ||
    currentStatus === 'ARRIVED' ||
    currentStatus === 'IN_PROGRESS' ||
    currentStatus === 'ACCEPTED';

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {onBackPress && (
          <TouchableOpacity style={styles.backBtn} onPress={onBackPress}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Map (shown only when partner is en-route/arrived/in-progress) ── */}
      <View style={showMap ? styles.mapContainerVisible : styles.mapContainerHidden}>
        <GoogleMapView
          mode="tracking"
          initialRegion={{
            ...customerLocation,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
          }}
          customerLocation={customerLocation}
          providerLocation={
            provider
              ? { latitude: provider.latitude, longitude: provider.longitude }
              : undefined
          }
          partnerBearing={provider?.bearing ?? 0}
          partnerName="Service Partner"
          hasPartnerLocation={!!provider}
          showControls={true}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* ── Status Info Card ── */}
      <View style={styles.infoCard}>
        {/* Status pill */}
        <View style={[styles.statusRow, { backgroundColor: config.color + '18' }]}>
          {config.showSpinner ? (
            <ActivityIndicator size="small" color={config.color} style={styles.statusIcon} />
          ) : (
            <Ionicons
              name={config.icon as any}
              size={22}
              color={config.color}
              style={styles.statusIcon}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: config.color }]}>
              {config.title}
            </Text>
            <Text style={styles.statusSubtitle}>{config.subtitle}</Text>
          </View>
        </View>

        {/* Worker details (after acceptance) */}
        {bookingStatus?.workerAssigned && bookingStatus.workerName && (
          <View style={styles.workerCard}>
            <Ionicons name="person-circle-outline" size={36} color="#6366F1" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.workerName}>{bookingStatus.workerName}</Text>
              {bookingStatus.workerPhone && (
                <Text style={styles.workerPhone}>{bookingStatus.workerPhone}</Text>
              )}
            </View>
            {currentStatus === 'ON_THE_WAY' && bookingStatus.estimatedArrivalMinutes && (
              <View style={styles.etaBadge}>
                <Text style={styles.etaText}>
                  {bookingStatus.estimatedArrivalMinutes} min
                </Text>
              </View>
            )}
          </View>
        )}

        {/* PIN display (for ARRIVED status) */}
        {currentStatus === 'ARRIVED' && bookingStatus?.pinCode && (
          <View style={styles.pinBox}>
            <Text style={styles.pinLabel}>Your Service PIN</Text>
            <Text style={styles.pinCode}>{bookingStatus.pinCode}</Text>
            <Text style={styles.pinHint}>Share this PIN with the partner to start the service</Text>
          </View>
        )}

        {/* Retry Matching button (WORKER_NOT_FOUND only) */}
        {currentStatus === 'WORKER_NOT_FOUND' && (
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetryMatching}>
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryBtnText}>Retry Matching</Text>
          </TouchableOpacity>
        )}

        {/* Booking ID */}
        {bookingId && (
          <Text style={styles.bookingIdText}>Booking #{bookingId.slice(0, 8).toUpperCase()}</Text>
        )}

        {/* Error fallback */}
        {statusError && !loading && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
            <Text style={styles.errorText}>{statusError}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
  },
  mapContainerVisible: {
    height: 300,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  mapContainerHidden: {
    height: 0,
    overflow: 'hidden',
  },
  infoCard: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  statusIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  statusTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  workerName: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
  },
  workerPhone: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  etaBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  etaText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#6366F1',
  },
  pinBox: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  pinLabel: {
    fontSize: 12,
    color: '#9A3412',
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pinCode: {
    fontSize: 40,
    fontFamily: Typography.fontFamily.bold,
    color: '#EA580C',
    letterSpacing: 10,
  },
  pinHint: {
    fontSize: 12,
    color: '#9A3412',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  retryBtnText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  bookingIdText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    flex: 1,
  },
});
