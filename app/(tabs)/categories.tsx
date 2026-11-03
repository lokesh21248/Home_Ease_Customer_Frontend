import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Shadows } from '../../src/constants/theme';
import { LayoutConstants, getScrollBottomPadding, getHeaderTopPadding } from '../../src/constants/layout';
import { useCategories, getCategoryFallbackImage } from '../../src/hooks/useCategories';

// ─── Types ───────────────────────────────────────────────────────────────────
type CategoryItem = {
  key?: string;
  id: string;
  name: string;
  image?: string;
  description?: string;
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_GAP = 10;
const PRIMARY_BLUE = LayoutConstants.BRAND_BLUE;

// ─── Category Card ────────────────────────────────────────────────────────────
function CategoryCard({
  item,
  cardWidth,
  onPress,
}: {
  item: CategoryItem;
  cardWidth: number;
  onPress: (item: CategoryItem) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const imageHeight = Math.round(cardWidth * 0.74);
  const cardFooterHeight = 46;
  const totalCardHeight = imageHeight + cardFooterHeight;

  const fallbackUri = getCategoryFallbackImage(item.name);
  const imageUri = !imageError && item.image ? item.image : fallbackUri;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth, height: totalCardHeight },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} category`}
    >
      {/* Image or Icon Placeholder */}
      <View style={[styles.cardImageWrap, { height: imageHeight }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.cardImage}
            contentFit="cover"
            transition={150}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholderWrap}>
            <Ionicons name="apps-outline" size={26} color="#94A3B8" />
          </View>
        )}
      </View>

      {/* Name + chevron */}
      <View style={[styles.cardFooter, { height: cardFooterHeight }]}>
        <Text style={styles.cardName} numberOfLines={2} ellipsizeMode="tail">
          {item.name}
        </Text>
        <Ionicons name="chevron-forward" size={13} color="#9CA3AF" />
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [search, setSearch] = useState('');

  // Responsive columns: 2 on compact (< 340), 4 on tablets (> 600), 3 on standard phones
  const numColumns = screenWidth < 340 ? 2 : screenWidth > 600 ? 4 : 3;
  const cardWidth = Math.floor(
    (screenWidth - LayoutConstants.HORIZONTAL_PADDING * 2 - CARD_GAP * (numColumns - 1)) / numColumns
  );

  const {
    data: rawCategories = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCategories();

  const categoryList: CategoryItem[] = useMemo(() => {
    return rawCategories.map((d, index) => ({
      key: `cat-live-${d.serviceId}-${index}`,
      id: d.serviceId,
      name: d.name,
      image: d.imageUrl || '',
      description: d.description || '',
    }));
  }, [rawCategories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categoryList;
    return categoryList.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query)),
    );
  }, [search, categoryList]);

  const handleCategoryPress = (item: CategoryItem) => {
    router.push({
      pathname: '/category/[id]',
      params: { id: item.id, name: item.name, image: item.image },
    });
  };

  const headerTopPadding = getHeaderTopPadding(insets.top, 10);
  const bottomScrollPadding = getScrollBottomPadding(insets.bottom);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Blue Top StatusBar filler for bounce/stretch */}
      <View style={[styles.topBarFill, { height: insets.top, backgroundColor: PRIMARY_BLUE }]} />

      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: headerTopPadding }]}>
        <Text style={styles.headerTitle}>Categories</Text>
        <Text style={styles.headerSubtitle}>Choose a service category</Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#8AA1C7" style={styles.searchIcon} />
          <TextInput
            id="categories-search-input"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search for services, e.g. AC Service, Cleaning..."
            placeholderTextColor="#8AA1C7"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color="#8AA1C7" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          <Text style={styles.loadingText}>Loading categories…</Text>
        </View>
      ) : isError && categoryList.length === 0 ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={56} color="#94A3B8" />
          <Text style={styles.errorTitle}>Unable to load categories</Text>
          <Text style={styles.errorSubtext}>
            {(error as any)?.message || 'Please check your internet connection and try again.'}
          </Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Ionicons name="reload" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.gridContent, { paddingBottom: bottomScrollPadding }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={async () => {
                await refetch();
              }}
              tintColor={PRIMARY_BLUE}
              colors={[PRIMARY_BLUE]}
            />
          }
        >
          {filteredCategories.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={52} color="#C7D2E0" />
              <Text style={styles.emptyText}>
                {search.trim().length > 0 ? 'No services found' : 'No categories available'}
              </Text>
              <Text style={styles.emptySubtext}>
                {search.trim().length > 0
                  ? `No results matching "${search}"`
                  : 'Check back soon for available service categories.'}
              </Text>
              {search.trim().length > 0 && (
                <Pressable style={styles.clearSearchBtn} onPress={() => setSearch('')}>
                  <Text style={styles.clearSearchText}>Clear search</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredCategories.map((item, index) => (
                <CategoryCard
                  key={item.key || `${item.id}-${index}`}
                  item={item}
                  cardWidth={cardWidth}
                  onPress={handleCategoryPress}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
  header: {
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
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 14,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 46,
    paddingHorizontal: 14,
    ...Shadows.sm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13.5,
    color: '#1E293B',
    paddingVertical: 0,
  },

  // Grid
  scrollView: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Shadows.sm,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  cardImageWrap: {
    width: '100%',
    backgroundColor: '#EEF2FA',
  },
  placeholderWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FA',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  cardName: {
    flex: 1,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11.5,
    color: '#1E293B',
    lineHeight: 15,
    paddingRight: 2,
  },

  // Loading / Empty
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 17,
    color: '#374151',
    marginTop: 4,
  },
  emptySubtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#9CA3AF',
  },
  clearSearchBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  clearSearchText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: '#334155',
  },

  // Error state
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  errorTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: '#1E293B',
    marginTop: 6,
  },
  errorSubtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
    marginTop: 8,
    ...Shadows.sm,
  },
  retryBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
