/**
 * Bookings Screen — HomeEase "My Bookings" with tabs.
 * Route: /(tabs)/bookings
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Booking, bookingApi } from '../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { LayoutConstants, getScrollBottomPadding, getHeaderTopPadding } from '../../src/constants/layout';
import { useMyBookings } from '../../src/hooks/useMyBookings';
import { queryClient } from '../../src/query/queryClient';
import { queryKeys } from '../../src/query/queryKeys';
import { useAuth } from '../../src/context/AuthContext';

type Tab = 'All' | 'Upcoming' | 'Ongoing' | 'Completed';

const PRIMARY_BLUE = LayoutConstants.BRAND_BLUE;

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:          { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7' },
  REQUESTED:        { label: 'Dispatching', color: '#10B981', bg: '#D1FAE5' },
  SEARCHING:        { label: 'Matching', color: '#10B981', bg: '#D1FAE5' },
  ACCEPTED:         { label: 'Assigned', color: '#059669', bg: '#D1FAE5' },
  CONFIRMED:        { label: 'Confirmed', color: '#2563EB', bg: '#DBEAFE' },
  ON_THE_WAY:       { label: 'On The Way', color: '#8B5CF6', bg: '#EDE9FE' },
  ARRIVED:          { label: 'Arrived', color: '#7C3AED', bg: '#EDE9FE' },
  IN_PROGRESS:      { label: 'Ongoing', color: '#3B82F6', bg: '#DBEAFE' },
  COMPLETED:        { label: 'Completed', color: '#059669', bg: '#A7F3D0' },
  CANCELLED:        { label: 'Cancelled', color: '#4B5563', bg: '#E5E7EB' },
  REJECTED:         { label: 'Re-matching', color: '#EF4444', bg: '#FEE2E2' },
  EXPIRED:          { label: 'Expired', color: '#6B7280', bg: '#F3F4F6' },
  WORKER_NOT_FOUND: { label: 'No Partner', color: '#EF4444', bg: '#FEE2E2' },
};

function getTab(status: string): Tab {
  if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'EXPIRED') return 'Completed';
  if (status === 'IN_PROGRESS' || status === 'ON_THE_WAY' || status === 'ARRIVED') return 'Ongoing';
  return 'Upcoming';
}

function BookingCard({
  booking,
  onPress,
  onCancel,
}: {
  booking: Booking;
  onPress: () => void;
  onCancel?: () => void;
}) {
  const badge = STATUS_BADGE[booking.status] || STATUS_BADGE.SEARCHING;
  const date = new Date(booking.scheduledAt);
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <Pressable style={styles.bookingCard} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop' }} 
          style={styles.serviceImage} 
        />
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.bookingService} numberOfLines={1}>{booking.serviceName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 }}>
            <View
              style={{
                backgroundColor: booking.bookingType === 'INSTANT' ? '#D1FAE5' : '#EFF6FF',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: booking.bookingType === 'INSTANT' ? '#059669' : '#2563EB',
                }}
              >
                {booking.bookingType === 'INSTANT' ? '⚡ Instant' : '📅 Scheduled'}
              </Text>
            </View>
            <Text style={styles.bookingId}>#{booking.bookingId.substring(0, 6).toUpperCase()}</Text>
          </View>
          
          <View style={styles.iconRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.bookingDate}>{dateStr}, {timeStr}</Text>
          </View>
          
          <View style={styles.iconRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.bookingLocation} numberOfLines={1}>Service Location</Text>
          </View>
        </View>

        <View style={styles.cardHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          <Text style={styles.priceText}>₹{booking.totalAmount}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={styles.chevron} />
        </View>
      </View>

      {/* Partner info row */}
      <View style={styles.providerRow}>
        <View style={styles.providerAvatarPlaceholder}>
          <Ionicons name="person" size={12} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.providerName}>{booking.workerName || 'Awaiting Partner'}</Text>
          <Text style={styles.providerTitle}>{booking.workerName ? 'Assigned Partner' : 'Finding match...'}</Text>
        </View>
      </View>
      
      {(booking.status === 'SEARCHING' || booking.status === 'ACCEPTED') && booking.pinCode && (
        <View style={styles.pinCodeContainer}>
          <Text style={styles.pinCodeLabel}>Share this PIN with partner</Text>
          <Text style={styles.pinCodeValue}>{booking.pinCode}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        {getTab(booking.status) === 'Upcoming' && (
          <>
            <Pressable
              style={styles.actionBtnOutline}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/booking/track/${booking.bookingId}`);
              }}
            >
              <Text style={styles.actionBtnOutlineText}>Reschedule</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtnOutline}
              onPress={(e) => {
                e.stopPropagation();
                onCancel?.();
              }}
            >
              <Text style={[styles.actionBtnOutlineText, { color: Colors.cancelled }]}>Cancel Booking</Text>
            </Pressable>
          </>
        )}
        {getTab(booking.status) === 'Ongoing' && (
          <Pressable
            style={styles.actionBtnPrimary}
            onPress={() => router.push(`/booking/track/${booking.bookingId}`)}
          >
            <Text style={styles.actionBtnPrimaryText}>Track Live</Text>
          </Pressable>
        )}
        {booking.status === 'COMPLETED' && (
          <>
            <Pressable
              style={styles.actionBtnOutline}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.actionBtnOutlineText}>Book Again</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtnOutline}
              onPress={() => router.push(`/booking/track/${booking.bookingId}`)}
            >
              <Text style={styles.actionBtnOutlineText}>View Details</Text>
            </Pressable>
          </>
        )}
        {booking.status === 'CANCELLED' && (
          <Pressable
            style={styles.actionBtnOutlineFull}
            onPress={() => router.push(`/booking/track/${booking.bookingId}`)}
          >
            <Text style={styles.actionBtnOutlineText}>View Details</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings = [], isLoading: loading } = useMyBookings();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.myBookings(userId ?? '') });
    setRefreshing(false);
  }, [userId]);

  const filtered = bookings.filter((b) => activeTab === 'All' || getTab(b.status) === activeTab);
  const TABS: Tab[] = ['All', 'Upcoming', 'Ongoing', 'Completed'];

  const headerTopPadding = getHeaderTopPadding(insets.top, 10);
  const bottomScrollPadding = getScrollBottomPadding(insets.bottom);

  const handleCancelBooking = useCallback((bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking request?',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingApi.cancelBooking(bookingId, 'Customer requested');
              await queryClient.invalidateQueries({ queryKey: queryKeys.myBookings(userId ?? '') });
              Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully.');
            } catch (err: any) {
              Alert.alert('Cancellation Error', err?.message || 'Could not cancel booking.');
            }
          },
        },
      ]
    );
  }, [userId]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Blue StatusBar filler */}
      <View style={[styles.topBarFill, { height: insets.top, backgroundColor: PRIMARY_BLUE }]} />

      {/* Blue Header Section */}
      <View style={[styles.headerContainer, { paddingTop: headerTopPadding }]}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>View, track and manage your service bookings</Text>
      </View>

      {/* Main Content Area (White with rounded top corners) */}
      <View style={styles.contentWrapper}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {TABS.map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        {loading ? (
          <ActivityIndicator color={PRIMARY_BLUE} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(b) => b.bookingId}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomScrollPadding }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[PRIMARY_BLUE]}
                tintColor={PRIMARY_BLUE}
              />
            }
            renderItem={({ item }) => (
              <BookingCard
                booking={item}
                onPress={() => router.push(`/booking/track/${item.bookingId}`)}
                onCancel={() => handleCancelBooking(item.bookingId)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>No bookings found</Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'All' 
                    ? 'Book a service to see it here.'
                    : `Your ${activeTab.toLowerCase()} bookings will appear here.`}
                </Text>
                {activeTab !== 'Completed' && (
                  <Pressable
                    style={styles.bookNowBtn}
                    onPress={() => router.push('/(tabs)')}
                  >
                    <Text style={styles.bookNowText}>Browse Services</Text>
                  </Pressable>
                )}
              </View>
            }
          />
        )}
      </View>
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
    paddingBottom: 22,
    borderBottomLeftRadius: LayoutConstants.HEADER_BORDER_RADIUS + 4,
    borderBottomRightRadius: LayoutConstants.HEADER_BORDER_RADIUS + 4,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 26,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  contentWrapper: {
    flex: 1,
    backgroundColor: '#F8F9FC',
    overflow: 'hidden',
  },

  tabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  tabsRow: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#EBF3FF',
  },
  tabText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13.5,
    color: '#4B5563',
  },
  tabTextActive: {
    color: PRIMARY_BLUE,
  },

  listContent: {
    padding: LayoutConstants.HORIZONTAL_PADDING,
    gap: 14,
  },

  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  serviceImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 3,
  },
  bookingService: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  bookingId: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingDate: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  bookingLocation: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  providerAvatarPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  providerTitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  
  cardHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 10,
  },
  priceText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  chevron: {
    marginTop: 2,
  },
  
  pinCodeContainer: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinCodeLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#92400E',
  },
  pinCodeValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 20,
    color: '#B45309',
    letterSpacing: 2,
  },

  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimaryText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  actionBtnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutlineFull: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutlineText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },

  emptyBox: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  bookNowBtn: {
    backgroundColor: PRIMARY_BLUE,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    marginTop: Spacing.sm,
  },
  bookNowText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#FFFFFF',
  },
});
