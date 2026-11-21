import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeHeroSection } from './HomeHeroSection';
import { HomeEasePassBanner } from './HomeEasePassBanner';
import { ExploreServicesGrid } from './ExploreServicesGrid';
import { PromoBanner } from './PromoBanner';
import { HomeOffersSection } from './HomeOffersSection';
import { HomeRecentBookings } from './HomeRecentBookings';
import { useExploreServices } from '../../hooks/useExploreServices';
import { useBanners } from '../../hooks/useBanners';
import { useMyBookings } from '../../hooks/useMyBookings';
import { queryClient } from '../../query/queryClient';
import { queryKeys } from '../../query/queryKeys';
import { getScrollBottomPadding } from '../../constants/layout';
import { ExploreServiceItem } from '../../api/client';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // ── Queries & Caching ──────────────────────────────────────────────────
  const {
    data: exploreServices = [],
    isLoading: isExploreLoading,
    isError: isExploreError,
    refetch: refetchExplore,
  } = useExploreServices();

  const { data: banners = [] } = useBanners();
  const { data: bookings = [] } = useMyBookings();

  // Calculate active/ongoing bookings for the notification bell badge
  const ongoingBookingsCount = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.status === 'SEARCHING' ||
        b.status === 'ACCEPTED' ||
        b.status === 'ON_THE_WAY' ||
        b.status === 'IN_PROGRESS'
    ).length;
  }, [bookings]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.banners() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.exploreServices() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons() }),
      queryClient.invalidateQueries({ queryKey: ['myBookings'] }),
    ]);
    setRefreshing(false);
  }, []);

  // ── Navigation Handlers ───────────────────────────────────────────────
  const handleLocationPress = () => {
    router.push('/location/select');
  };

  const handleNotificationPress = () => {
    router.push('/(tabs)/notifications');
  };

  const handleInstantBookPress = () => {
    router.push({
      pathname: '/booking/date-time',
      params: { bookingType: 'INSTANT' },
    });
  };

  const handleSchedulePress = () => {
    router.push({
      pathname: '/booking/date-time',
      params: { bookingType: 'SCHEDULED' },
    });
  };

  const handlePassPress = () => {
    router.push('/(tabs)/categories');
  };

  const handleSelectService = (item: ExploreServiceItem) => {
    const targetId = item.categoryId || item.id;
    router.push({
      pathname: '/service/[id]',
      params: {
        id: targetId,
        name: item.name,
        image: item.imageUrl,
        price: item.price ? String(item.price) : undefined,
      },
    });
  };

  const handleBannerPress = (targetId?: string, title?: string) => {
    if (targetId) {
      router.push({
        pathname: '/service/[id]',
        params: { id: targetId, name: title },
      });
    } else {
      router.push('/(tabs)/categories');
    }
  };

  const handleViewAllPress = () => {
    router.push('/(tabs)/categories');
  };

  const bottomScrollPadding = getScrollBottomPadding(insets.bottom);

  return (
    <View style={styles.container}>
      {/* 1. Light Status Bar on royal blue top bar */}
      <StatusBar style="light" />

      {/* Persistent Status Bar Shield: Keeps device status indicators protected from scrolling content */}
      <View
        style={[
          styles.statusBarShield,
          { height: insets.top, backgroundColor: '#0052FF' },
        ]}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomScrollPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0052FF"
            colors={['#0052FF']}
          />
        }
      >
        {/* 1. Top Bar & Hero Section (Location, Earn ₹200, Bell with active badge, Hero Title & Quick Action Cards) */}
        <HomeHeroSection
          onLocationPress={handleLocationPress}
          onNotificationPress={handleNotificationPress}
          onInstantBookPress={handleInstantBookPress}
          onSchedulePress={handleSchedulePress}
          unreadCount={ongoingBookingsCount}
        />

        {/* 2. Recently Booked Services (Active live-tracking or one-tap rebooking) */}
        <HomeRecentBookings />

        {/* 3. Promotional Banners (Real Festival Cleaning, Summer Heat AC Jet Wash) */}
        {banners.length > 0 && (
          <PromoBanner banners={banners} onPress={handleBannerPress} />
        )}

        {/* 4. HomeEase Pass Banner (Buy One Pass Three Visits FREE) */}
        <HomeEasePassBanner onPress={handlePassPress} />

        {/* 5. Exclusive Offers & Active Promo Coupons (WELCOME50, MEGA100) */}
        <HomeOffersSection />

        {/* 6. Explore Services: Real Backend Explore Services + Categories Grid */}
        <ExploreServicesGrid
          services={exploreServices}
          isLoading={isExploreLoading}
          isError={isExploreError}
          onRetry={refetchExplore}
          onSelectService={handleSelectService}
          onViewAllPress={handleViewAllPress}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statusBarShield: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
