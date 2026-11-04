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
import { ExploreServicesGrid, ExploreGridItem } from './ExploreServicesGrid';
import { useCategories } from '../../hooks/useCategories';
import { queryClient } from '../../query/queryClient';
import { queryKeys } from '../../query/queryKeys';
import { getScrollBottomPadding } from '../../constants/layout';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // ── Queries & Caching ──────────────────────────────────────────────────
  const { data: rawCategories = [] } = useCategories();

  // ── Pull-to-refresh ────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.banners() }),
      queryClient.invalidateQueries({ queryKey: ['exploreServices'] }),
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

  const handleSelectService = (item: ExploreGridItem) => {
    if (rawCategories.length > 0 && item.categoryMatch) {
      const matched = rawCategories.find(
        (c) =>
          c.name.toLowerCase().includes(item.categoryMatch!.toLowerCase()) ||
          item.categoryMatch!.toLowerCase().includes(c.name.toLowerCase())
      );
      if (matched) {
        router.push({
          pathname: '/category/[id]',
          params: { id: matched.serviceId, name: matched.name },
        });
        return;
      }
    }
    router.push('/(tabs)/categories');
  };

  const handleViewAllPress = () => {
    router.push('/(tabs)/categories');
  };

  const bottomScrollPadding = getScrollBottomPadding(insets.bottom);

  return (
    <View style={styles.container}>
      {/* 1. Android & iOS Status Bar: light icons over dark blue top bar */}
      <StatusBar style="light" />

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
        {/* 2. Top Bar & Hero Section (Location, Earn ₹200, Bell, Hero Title, Cleaner & 2 Quick Action Cards) */}
        <HomeHeroSection
          onLocationPress={handleLocationPress}
          onNotificationPress={handleNotificationPress}
          onInstantBookPress={handleInstantBookPress}
          onSchedulePress={handleSchedulePress}
        />

        {/* 3. HomeEase Pass Banner with 3 Pagination Dots */}
        <HomeEasePassBanner onPress={handlePassPress} />

        {/* 4. Explore Services: 4-Column x 3-Row Grid with 12 Exact Services */}
        <ExploreServicesGrid
          categories={rawCategories}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
