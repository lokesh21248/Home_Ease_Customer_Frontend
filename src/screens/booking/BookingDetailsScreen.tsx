import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useBooking } from '../../context/BookingContext';
import { bookingApi } from '../../api/bookingApi';
import { Booking } from '../../types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { PriceBreakdown } from '../../components/booking/PriceBreakdown';
import { Button } from '../../components/common/Button';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type BookingDetailsRouteProp = RouteProp<RootStackParamList, 'BookingDetails'>;
type BookingDetailsNavProp = StackNavigationProp<RootStackParamList, 'BookingDetails'>;

interface Props {
  route: BookingDetailsRouteProp;
  navigation: BookingDetailsNavProp;
}

export const BookingDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const { cancelBooking, bookings } = useBooking();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadDetails = async () => {
    const found = await bookingApi.getBookingById(bookingId);
    if (found) {
      setBooking(found);
    } else {
      const fallback = bookings.find((b) => b.id === bookingId);
      if (fallback) setBooking(fallback);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [bookingId, bookings]);

  const handleCancelBooking = async () => {
    setCancelling(true);
    try {
      await cancelBooking(bookingId);
      setShowCancelModal(false);
      Alert.alert('Booking Cancelled', 'Your booking has been cancelled and any refund will be processed in 2-3 business days.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  if (!booking) {
    return (
      <ScreenWrapper>
        <Header title="Booking Details" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Text style={styles.notFoundText}>Loading booking details...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const isCancellable = booking.status === 'upcoming' || booking.status === 'active';

  return (
    <ScreenWrapper>
      <Header title="Booking Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, SHADOWS.card]}>
          <View style={styles.statusHeaderRow}>
            <Text style={styles.bookingId}>Booking #{booking.id}</Text>
            <Badge label={booking.status.toUpperCase()} variant="price" />
          </View>
          <Text style={styles.bookedOnText}>Booked on {booking.createdAt}</Text>

          {/* 4-Digit Security PIN Badge */}
          <View style={styles.pinInlineRow}>
            <View style={styles.pinInlineBadge}>
              <Ionicons name="keypad" size={15} color={COLORS.primaryDark} style={{ marginRight: 6 }} />
              <Text style={styles.pinInlineLabel}>Security PIN: </Text>
              <Text style={styles.pinInlineValue}>{booking.pinCode || '4821'}</Text>
            </View>
            <Text style={styles.pinInlineHint}>Share with worker upon arrival</Text>
          </View>
        </View>

        {/* Service Details Card */}
        <View style={[styles.infoCard, SHADOWS.card]}>
          <View style={styles.serviceRow}>
            <Image source={{ uri: booking.serviceImage }} style={styles.serviceImage} />
            <View style={styles.serviceTextCol}>
              <Text style={styles.serviceName}>{booking.serviceName}</Text>
              {booking.package && (
                <Text style={styles.packageName}>{booking.package.name}</Text>
              )}
              <Text style={styles.servicePrice}>₹{booking.payment.total}</Text>
            </View>
          </View>
        </View>

        {/* Date & Time */}
        <View style={[styles.infoCard, SHADOWS.subtle]}>
          <View style={styles.iconTitleRow}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.primaryDark} />
            <Text style={styles.cardTitle}>Date & Time</Text>
          </View>
          <Text style={styles.cardValue}>{booking.date}</Text>
          <Text style={styles.cardSubValue}>{booking.timeSlot}</Text>
        </View>

        {/* Service Address */}
        <View style={[styles.infoCard, SHADOWS.subtle]}>
          <View style={styles.iconTitleRow}>
            <Ionicons name="location-outline" size={18} color={COLORS.primaryDark} />
            <Text style={styles.cardTitle}>Service Address</Text>
          </View>
          <Text style={styles.cardValue}>
            {booking.address.label || booking.address.type}
          </Text>
          <Text style={styles.cardSubValue}>
            {booking.address.addressLine || [booking.address.houseFlat, booking.address.street, booking.address.area, booking.address.city, booking.address.pincode].filter(Boolean).join(', ')}
          </Text>
        </View>

        {/* Professional Details if present */}
        {booking.professional && (
          <View style={[styles.infoCard, SHADOWS.subtle]}>
            <View style={styles.iconTitleRow}>
              <Ionicons name="person-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.cardTitle}>Assigned Professional</Text>
            </View>
            <View style={styles.proRow}>
              <Image source={{ uri: booking.professional.avatarUrl }} style={styles.proAvatar} />
              <View style={styles.proInfo}>
                <Text style={styles.proName}>{booking.professional.name}</Text>
                <Text style={styles.proRole}>{booking.professional.role}</Text>
                <Text style={styles.proRating}>★ {booking.professional.rating} ({booking.professional.reviewsCount} reviews)</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Summary */}
        <PriceBreakdown
          subtotal={booking.payment.subtotal}
          platformFee={booking.payment.platformFee}
          taxes={booking.payment.taxes}
          discount={booking.payment.discount}
          total={booking.payment.total}
        />

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {(booking.status === 'active' || booking.status === 'upcoming') && (
            <Button
              title="Track Professional"
              onPress={() => navigation.navigate('LiveTracking', { bookingId: booking.id })}
              variant="primary"
              size="lg"
              leftIcon={<Ionicons name="navigate-outline" size={18} color={COLORS.primaryDark} />}
            />
          )}

          <Button
            title="Download Invoice (PDF)"
            onPress={() => Alert.alert('Invoice', `Invoice #INV-${booking.id} downloaded to your device.`)}
            variant="secondary"
            size="md"
            leftIcon={<Ionicons name="download-outline" size={18} color={COLORS.primaryDark} />}
          />

          {isCancellable && (
            <Button
              title="Cancel Booking"
              onPress={() => setShowCancelModal(true)}
              variant="outline"
              size="md"
              textStyle={{ color: COLORS.error }}
              style={{ borderColor: COLORS.error }}
            />
          )}
        </View>
      </ScrollView>

      {/* Cancellation Confirmation Modal */}
      <ConfirmationModal
        visible={showCancelModal}
        title="Cancel Booking?"
        message="Are you sure you want to cancel this booking? Cancellation within 2 hours of service may incur minimal fee."
        confirmTitle="Yes, Cancel"
        cancelTitle="Keep Booking"
        isDestructive
        loading={cancelling}
        onConfirm={handleCancelBooking}
        onCancel={() => setShowCancelModal(false)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xs,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingId: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  bookedOnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  pinInlineRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(50, 100, 80, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  pinInlineLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  pinInlineValue: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 1,
  },
  pinInlineHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImage: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.lg,
  },
  serviceTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  packageName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginTop: 4,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  cardSubValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  proAvatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
  },
  proInfo: {
    marginLeft: 12,
    flex: 1,
  },
  proName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  proRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  proRating: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    marginTop: 2,
  },
  actionsContainer: {
    gap: 12,
    marginTop: SPACING.md,
  },
});
