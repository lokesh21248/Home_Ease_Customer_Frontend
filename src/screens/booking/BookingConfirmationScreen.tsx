import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Button } from '../../components/common/Button';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type ConfirmationRouteProp = RouteProp<RootStackParamList, 'BookingConfirmation'>;
type ConfirmationNavProp = StackNavigationProp<RootStackParamList, 'BookingConfirmation'>;

interface Props {
  route: ConfirmationRouteProp;
  navigation: ConfirmationNavProp;
}

export const BookingConfirmationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { booking } = route.params;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animated Checkmark Circle */}
        <View style={styles.topIconBox}>
          <View style={styles.checkCircleLarge}>
            <Ionicons name="checkmark-sharp" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.confirmedTitle}>Booking Confirmed!</Text>
          <Text style={styles.confirmedSubtitle}>
            Your home service has been scheduled. A professional will be arriving on time.
          </Text>
        </View>

        {/* Booking Card Details */}
        <View style={[styles.card, SHADOWS.card]}>
          <View style={styles.bookingIdRow}>
            <Text style={styles.idLabel}>Booking ID</Text>
            <Text style={styles.idValue}>#{booking.id.length > 12 ? booking.id.substring(0, 8).toUpperCase() : booking.id}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.serviceRow}>
            <Image source={{ uri: booking.serviceImage }} style={styles.serviceThumb} />
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName}>{booking.serviceName}</Text>
              {booking.package && (
                <Text style={styles.packageName}>{booking.package.name}</Text>
              )}
              <Text style={styles.servicePrice}>₹{booking.payment.total}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.primaryDark} />
            <View style={styles.metaTextCol}>
              <Text style={styles.metaLabel}>Date & Time</Text>
              <Text style={styles.metaValue}>
                {booking.date} · {booking.timeSlot}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={18} color={COLORS.primaryDark} />
            <View style={styles.metaTextCol}>
              <Text style={styles.metaLabel}>Service Address</Text>
              <Text style={styles.metaValue} numberOfLines={2}>
                {booking.address.addressLine || [booking.address.houseFlat, booking.address.street, booking.address.city].filter(Boolean).join(', ')}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
            <View style={styles.metaTextCol}>
              <Text style={styles.metaLabel}>Payment Status</Text>
              <Text style={[styles.metaValue, { color: COLORS.success, fontWeight: '700' }]}>
                Paid via {booking.payment.method} (₹{booking.payment.total})
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 4-Digit Security PIN Badge */}
          <View style={styles.pinConfirmBox}>
            <Text style={styles.pinConfirmLabel}>Security PIN for Arrival</Text>
            <View style={styles.pinBadgeRow}>
              {(booking.pinCode || '4821').split('').map((digit, i) => (
                <View key={i} style={styles.pinSquare}>
                  <Text style={styles.pinSquareText}>{digit}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.pinConfirmSub}>Give this 4-digit PIN to the worker to start your service</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title="Track Professional"
            onPress={() => navigation.navigate('LiveTracking', { bookingId: booking.id })}
            variant="primary"
            size="lg"
            leftIcon={<Ionicons name="navigate-outline" size={20} color={COLORS.primaryDark} />}
            style={styles.actionBtn}
          />

          <Button
            title="View Booking Details"
            onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })}
            variant="secondary"
            size="lg"
            style={styles.actionBtn}
          />

          <Button
            title="Back to Home"
            onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
            variant="ghost"
            size="md"
            style={styles.homeBtn}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xl,
    paddingBottom: 40,
  },
  topIconBox: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  checkCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: SPACING.md,
  },
  confirmedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  confirmedSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: SPACING.lg,
  },
  bookingIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  idValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(50, 100, 80, 0.1)',
    marginVertical: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceThumb: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
  },
  serviceDetails: {
    flex: 1,
    marginLeft: 12,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  packageName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  metaTextCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 1,
  },
  pinConfirmBox: {
    backgroundColor: 'rgba(235, 245, 240, 0.85)',
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    marginTop: 4,
  },
  pinConfirmLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 8,
  },
  pinBadgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  pinSquare: {
    width: 44,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinSquareText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  pinConfirmSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
  },
  actionBtn: {
    width: '100%',
  },
  homeBtn: {
    marginTop: 4,
  },
});
