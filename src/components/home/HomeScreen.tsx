import React, { useState, useCallback } from 'react';
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
import { useExploreServices } from '../../hooks/useExploreServices';
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
    if (item.categoryId) {
      router.push({
        pathname: '/category/[id]',
        params: { id: item.categoryId, name: item.categoryName || item.name },
      });
      return;
    }

    router.push({
      pathname: '/service/[id]',
      params: {
        id: item.id,
        name: item.name,
        image: item.imageUrl,
        price: item.price ? String(item.price) : undefined,
      },
    });
  };

  const handleViewAllPress = () => {
    router.push('/(tabs)/categories');
  };

  const bottomScrollPadding = getScrollBottomPadding(insets.bottom);

  return (
    <View style={styles.container}>
      {/* 1. Light Status Bar on royal blue top bar */}
      <StatusBar style="light" />

      {/* Persistent Status Bar Shield: Keeps device status indicators (time, battery, WiFi) protected from scrolling content */}
      <View
        style={[
          styles.statusBarShield,
          { height: insets.top, backgroundColor: '#004BE4' },
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
        {/* 1. Top Bar & Hero Section (Location, Earn ₹200, Bell, Hero Title & Quick Action Cards) */}
        <HomeHeroSection
          onLocationPress={handleLocationPress}
          onNotificationPress={handleNotificationPress}
          onInstantBookPress={handleInstantBookPress}
          onSchedulePress={handleSchedulePress}
        />

        {/* 2. HomeEase Pass Banner (Buy One Pass Three Visits FREE, 4 dots) */}
        <HomeEasePassBanner onPress={handlePassPress} />

        {/* 3. Explore Services: 4-Column Grid of 12 Services with Ratings, Thumbnails & Add Buttons */}
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
