import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useBooking } from '../../context/BookingContext';
import { BookingStatus } from '../../types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type BookingsScreenNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'BookingsTab'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: BookingsScreenNavProp;
}

const TABS: { label: string; status: BookingStatus }[] = [
  { label: 'Active', status: 'active' },
  { label: 'Upcoming', status: 'upcoming' },
  { label: 'Completed', status: 'completed' },
  { label: 'Cancelled', status: 'cancelled' },
];

export const BookingsScreen: React.FC<Props> = ({ navigation }) => {
  const { bookings, refreshBookings, isLoadingBookings } = useBooking();
  const [selectedTab, setSelectedTab] = useState<BookingStatus>('active');

  const isMatchingTab = (status: BookingStatus, tab: BookingStatus) => {
    const s = (status || '').toUpperCase();
    if (tab === 'active') {
      return ['ACTIVE', 'IN_PROGRESS', 'ACCEPTED', 'SEARCHING_WORKER'].includes(s);
    }
    if (tab === 'upcoming') {
      return ['UPCOMING', 'CONFIRMED', 'PENDING'].includes(s);
    }
    if (tab === 'completed') {
      return s === 'COMPLETED';
    }
    if (tab === 'cancelled') {
      return s === 'CANCELLED';
    }
    return s === tab.toUpperCase();
  };

  const filteredBookings = bookings.filter((b) => isMatchingTab(b.status, selectedTab));

  const getStatusBadgeVariant = (status: BookingStatus) => {
    const s = (status || '').toUpperCase();
    if (['ACTIVE', 'IN_PROGRESS', 'ACCEPTED', 'SEARCHING_WORKER'].includes(s)) {
      return 'price';
    }
    if (['UPCOMING', 'CONFIRMED', 'PENDING'].includes(s)) {
      return 'yellow';
    }
    if (s === 'COMPLETED') {
      return 'status';
    }
    return 'outline';
  };

  return (
    <ScreenWrapper>
      <Header title="My Bookings" showBack={false} />

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const isSelected = selectedTab === tab.status;
          return (
            <TouchableOpacity
              key={tab.status}
              activeOpacity={0.8}
              onPress={() => setSelectedTab(tab.status)}
              style={[
                styles.tabPill,
                isSelected && styles.tabPillSelected,
                SHADOWS.subtle,
              ]}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingBookings}
            onRefresh={() => refreshBookings()}
            tintColor={COLORS.primary}
          />
        }
      >
        {filteredBookings.length === 0 ? (
          <EmptyState
            iconName="calendar-outline"
            title={`No ${selectedTab} bookings`}
            description={`You do not have any ${selectedTab} home service appointments right now.`}
            actionTitle="Explore Services"
            onAction={() => navigation.navigate('HomeTab')}
          />
        ) : (
          filteredBookings.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })}
              style={[styles.bookingCard, SHADOWS.card]}
            >
              {/* Header: ID & Status Badge */}
              <View style={styles.cardHeader}>
                <Text style={styles.bookingId}>#{booking.id.length > 12 ? booking.id.substring(0, 8).toUpperCase() : booking.id}</Text>
                <Badge
                  label={booking.status.toUpperCase()}
                  variant={getStatusBadgeVariant(booking.status)}
                />
              </View>

              {/* Service info */}
              <View style={styles.serviceRow}>
                <Image source={{ uri: booking.serviceImage }} style={styles.serviceThumb} />
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceTitle}>{booking.serviceName}</Text>
                  <Text style={styles.dateTimeText}>
                    <Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} />{' '}
                    {booking.date} · {booking.timeSlot}
                  </Text>
                  <Text style={styles.priceText}>₹{booking.payment.total}</Text>
                </View>
              </View>

              {/* Professional row if assigned */}
              {booking.professional && (
                <View style={styles.proRow}>
                  <Image source={{ uri: booking.professional.avatarUrl }} style={styles.proAvatar} />
                  <Text style={styles.proName}>
                    Pro: <Text style={{ fontWeight: '700' }}>{booking.professional.name}</Text>
                  </Text>
                </View>
              )}

              {/* Footer Actions */}
              <View style={styles.cardFooter}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })}
                  style={styles.detailsBtn}
                >
                  <Text style={styles.detailsBtnText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.primaryDark} />
                </TouchableOpacity>

                {['active', 'upcoming', 'IN_PROGRESS', 'ACCEPTED', 'SEARCHING_WORKER'].includes(booking.status) && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('LiveTracking', { bookingId: booking.id })}
                    style={styles.trackBtn}
                  >
                    <Ionicons name="navigate-outline" size={14} color={COLORS.primaryDark} />
                    <Text style={styles.trackBtnText}>Track</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.base,
    gap: 8,
    marginBottom: SPACING.sm,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillSelected: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  tabTextSelected: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xs,
    paddingBottom: 100,
  },
  bookingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingId: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceThumb: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  dateTimeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginTop: 4,
  },
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(235, 245, 240, 0.7)',
    borderRadius: RADIUS.md,
    padding: 6,
    paddingHorizontal: 10,
    marginTop: 10,
    gap: 8,
  },
  proAvatar: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
  },
  proName: {
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(50, 100, 80, 0.1)',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
});
