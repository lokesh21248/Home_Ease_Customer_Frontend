import React, { useMemo, useState } from 'react';
import {
  Pressable,
  FlatList,
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
const HORIZONTAL_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 3;
const PRIMARY_BLUE = LayoutConstants.BRAND_BLUE;

// ─── Category Grid Card (Prompt 1) ───────────────────────────────────────────
function CategoryGridCard({
  item,
  cardWidth,
  onPress,
}: {
  item: CategoryItem;
  cardWidth: number;
  onPress: (item: CategoryItem) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const fallbackUri = getCategoryFallbackImage(item.name);
  const imageUri = !imageError && item.image ? item.image : fallbackUri;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardContainer,
        { width: cardWidth },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} category`}
    >
      {/* 1. Rounded Image Thumbnail with Aspect Ratio 1:1 */}
      <View style={[styles.thumbnailWrap, { width: cardWidth, height: cardWidth }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.thumbnailImage}
            contentFit="cover"
            transition={150}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholderWrap}>
            <Ionicons name="apps-outline" size={28} color="#94A3B8" />
          </View>
        )}
      </View>

      {/* 2. Category Title Below Image */}
      <Text style={styles.categoryTitle} numberOfLines={2} ellipsizeMode="tail">
        {item.name}
      </Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [search, setSearch] = useState('');

  // Explicit 3-column calculation
  const cardWidth = Math.floor(
    (screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS
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

  const headerTopPadding = getHeaderTopPadding(insets.top, 8);
  const bottomScrollPadding = getScrollBottomPadding(insets.bottom, 24);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Blue Top StatusBar filler for bounce/stretch */}
      <View style={[styles.topBarFill, { height: insets.top, backgroundColor: PRIMARY_BLUE }]} />

      {/* Blue Header with Search Bar */}
      <View style={[styles.header, { paddingTop: headerTopPadding }]}>
        <Text style={styles.headerTitle}>Categories</Text>
        <Text style={styles.headerSubtitle}>Choose a service category</Text>

        {/* Search bar (height: 48, borderRadius: 24, paddingHorizontal: 16) */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            id="categories-search-input"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search for services, e.g. Cleaning..."
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color="#64748B" />
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
        <FlatList
          data={filteredCategories}
          keyExtractor={(item, index) => item.key || `${item.id}-${index}`}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomScrollPadding }]}
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
          ListEmptyComponent={
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
          }
          renderItem={({ item }) => (
            <CategoryGridCard
              item={item}
              cardWidth={cardWidth}
              onPress={handleCategoryPress}
            />
          )}
        />
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
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    height: 48,
    paddingHorizontal: 16,
    ...Shadows.sm,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 0,
  },

  // 3-Column Grid
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 18,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    gap: GRID_GAP,
    marginBottom: 14,
  },
  cardContainer: {
    alignItems: 'center',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  thumbnailWrap: {
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  placeholderWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FA',
  },
  categoryTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 17,
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
