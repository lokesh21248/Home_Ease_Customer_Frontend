import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMyBookings } from '../../hooks/useMyBookings';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Booking } from '../../api/client';

export function HomeRecentBookings() {
  const { data: bookings = [] } = useMyBookings();

  if (!bookings || bookings.length === 0) {
    return null;
  }

  // Take the 3 most recent bookings
  const recentList = bookings.slice(0, 3);

  const handleBookingPress = (booking: Booking) => {
    router.push(`/booking/track/${booking.bookingId}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Recently Booked</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/bookings')}
          accessibilityRole="button"
          accessibilityLabel="View all bookings"
        >
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recentList.map((item, index) => {
          const isOngoing =
            item.status === 'SEARCHING' ||
            item.status === 'ACCEPTED' ||
            item.status === 'ON_THE_WAY' ||
            item.status === 'IN_PROGRESS';
          const isLast = index === recentList.length - 1;

          return (
            <Pressable
              key={item.bookingId}
              style={({ pressed }) => [
                styles.card,
                !isLast && { marginRight: 12 },
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleBookingPress(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.serviceName}, Status: ${item.status}`}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name={isOngoing ? 'pulse-outline' : 'checkmark-done'}
                    size={16}
                    color={isOngoing ? Colors.primary : Colors.success}
                  />
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: isOngoing ? Colors.primaryFade : Colors.successLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: isOngoing ? Colors.primary : Colors.success },
                    ]}
                  >
                    {isOngoing ? 'Active' : 'Completed'}
                  </Text>
                </View>
              </View>

              <Text style={styles.serviceName} numberOfLines={1} ellipsizeMode="tail">
                {item.serviceName}
              </Text>

              <Text style={styles.bookingId}>
                #{item.bookingId.substring(0, 8).toUpperCase()}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.priceText}>₹{item.totalAmount}</Text>
                <Text style={styles.actionText}>
                  {isOngoing ? 'Track Live →' : 'Rebook →'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  viewAllText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 20,
  },
  card: {
    width: 220,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
  },
  serviceName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  bookingId: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  priceText: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  actionText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: Colors.primary,
  },
});

