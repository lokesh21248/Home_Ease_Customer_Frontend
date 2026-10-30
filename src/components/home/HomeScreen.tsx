import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Wallet, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from './Header';
import { PromoBanner } from './PromoBanner';
import { SectionHeader } from './SectionHeader';
import { CategoryGrid } from './CategoryGrid';
import { PopularServices } from './PopularServices';
import { FloatingActionButton } from '../common/FloatingActionButton';
import {
  HomeColors,
  CategoryItem,
  PopularServiceItem,
} from './types';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../hooks/useWallet';
import { Typography } from '../../constants/theme';
import { LayoutConstants, getScrollBottomPadding } from '../../constants/layout';
import { Banner } from '../../api/client';
import { useCategories } from '../../hooks/useCategories';
import { useBanners } from '../../hooks/useBanners';
import { queryClient } from '../../query/queryClient';
import { queryKeys } from '../../query/queryKeys';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { balance } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Cached queries ───────────────────────────────────────────────────────
  const { data: rawCategories = [] } = useCategories();
  const { data: rawBanners = [] } = useBanners();

  // Fallback initial from user if available, default to 'E' as in reference
  const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'E';

  // Map live categories to the local CategoryItem shape (only API categories)
  const categories: CategoryItem[] = rawCategories.map((cat, index) => ({
    key: `cat-live-${cat.serviceId}-${index}`,
    id: cat.serviceId,
    name: cat.name,
    image: cat.imageUrl || '',
  }));

  // Extract popular sub-services directly from categories API response
  const popularServices: PopularServiceItem[] = (() => {
    const items: PopularServiceItem[] = [];
    rawCategories.forEach((cat) => {
      if (cat.subServices && Array.isArray(cat.subServices)) {
        cat.subServices.forEach((sub: any) => {
          items.push({
            key: `pop-${sub.subServiceId}`,
            id: cat.serviceId,
            subServiceId: sub.subServiceId,
            name: sub.name,
            price: sub.basePrice,
            image: sub.imageUrl || '',
          });
        });
      }
    });
    return items;
  })();

  const banners: Banner[] = rawBanners.length > 0 ? rawBanners : [];

  // Pull-to-refresh: invalidate cached data so fresh data is fetched
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.categories() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.banners() }),
    ]);
    setRefreshing(false);
  }, []);

  const handleLocationPress = () => {
    router.push('/location/select');
  };

  const handleNotificationPress = () => {
    router.push('/(tabs)/notifications');
  };

  const handleProfilePress = () => {
    router.push('/(tabs)/profile');
  };

  const handleSearchPress = () => {
    // Focus or browse
  };

  const handleBannerPress = (targetId: string, title: string) => {
    const banner = banners.find((b) => b.targetId === targetId);
    router.push({
      pathname: '/category/[id]',
      params: {
        id: targetId,
        name: title,
        image: banner?.imageUrl || '',
      },
    });
  };

  const handleSeeAllCategories = () => {
    router.push('/(tabs)/categories');
  };

  const handleSeeAllPopular = () => {
    router.push('/(tabs)/categories');
  };

  const handleSelectCategory = (id: string, name: string) => {
    const cat = categories.find((c) => c.id === id);
    router.push({
      pathname: '/category/[id]',
      params: {
        id,
        name,
        image: typeof cat?.image === 'string' ? cat.image : '',
      },
    });
  };

  const handleSelectPopularService = (id: string, name: string) => {
    const pop = popularServices.find((p) => p.name === name || p.id === id);
    const catId = pop?.id || id;
    const cat = categories.find((c) => c.id === catId);
    router.push({
      pathname: '/service/[id]',
      params: {
        id: catId,
        name: cat?.name || name,
        subServiceId: pop?.subServiceId || '',
        price: pop?.price ? String(pop.price) : '',
        image: typeof cat?.image === 'string' ? cat.image : typeof pop?.image === 'string' ? pop.image : '',
      },
    });
  };

  // Filter categories if user types a search query
  const filteredCategories = searchQuery.trim()
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : categories;

  const filteredPopularServices = searchQuery.trim()
    ? popularServices.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : popularServices;

  const bottomScrollPadding = getScrollBottomPadding(insets.bottom);

  return (
    <View style={styles.container}>
      {/* 1. Android Status Bar: light icons, blue background */}
      <RNStatusBar
        barStyle="light-content"
        backgroundColor={HomeColors.primaryBlue}
        translucent={Platform.OS === 'android'}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomScrollPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={HomeColors.primaryBlue}
            colors={[HomeColors.primaryBlue]}
          />
        }
      >
        {/* 2 & 3. Blue Header with LocationHeader, Headline & SearchBar */}
        <Header
          userInitial={userInitial}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchPress={handleSearchPress}
          onLocationPress={handleLocationPress}
          onNotificationPress={handleNotificationPress}
          onProfilePress={handleProfilePress}
        />

        {/* Wallet Quick Access Card (Home Screen) */}
        <Pressable
          style={styles.walletCard}
          onPress={() => router.push('/profile/wallet')}
          accessibilityRole="button"
          accessibilityLabel={`HomeEase Wallet Balance: ₹${balance}`}
        >
          <View style={styles.walletLeft}>
            <View style={styles.walletIconCircle}>
              <Wallet size={18} color={HomeColors.primaryBlue} />
            </View>
            <View style={styles.walletTextCol}>
              <View style={styles.walletTitleRow}>
                <Text style={styles.walletTitle}>HomeEase Wallet</Text>
                <View style={styles.cashbackPill}>
                  <Text style={styles.cashbackPillText}>Instant Pay</Text>
                </View>
              </View>
              <Text style={styles.walletSub} numberOfLines={1}>
                Balance: ₹{balance.toLocaleString('en-IN')} • 5% Extra Cashback
              </Text>
            </View>
          </View>
          <View style={styles.walletRightBtn}>
            <Text style={styles.walletAddText}>+ Top Up</Text>
          </View>
        </Pressable>

        {/* 4. Promotional Banner */}
        <PromoBanner banners={banners} onPress={handleBannerPress} />

        {/* 5. Category Section */}
        <SectionHeader
          title="Category"
          actionText="See All →"
          onActionPress={handleSeeAllCategories}
        />
        <CategoryGrid
          categories={filteredCategories}
          onSelectCategory={handleSelectCategory}
        />

        {/* 6. Popular Services Section */}
        <PopularServices
          services={filteredPopularServices}
          onSeeAllPress={handleSeeAllPopular}
          onSelectService={handleSelectPopularService}
        />
      </ScrollView>

      {/* Floating Settings Shortcut Button (respects bottom navigation clearance) */}
      <FloatingActionButton
        onPress={() => router.push('/profile/settings')}
        icon={<Settings size={22} color="#FFFFFF" />}
        isTabScreen={true}
        accessibilityLabel="App Settings"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HomeColors.lightBackground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 121, 248, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#1479F8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {
        shadowColor: '#1479F8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
    }),
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  walletIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(20, 121, 248, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  walletTextCol: {
    flex: 1,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#111827',
  },
  cashbackPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  cashbackPillText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 10,
    color: HomeColors.primaryBlue,
  },
  walletSub: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 1,
  },
  walletRightBtn: {
    backgroundColor: HomeColors.primaryBlue,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  walletAddText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
});
