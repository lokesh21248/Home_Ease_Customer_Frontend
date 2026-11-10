import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ExploreServiceItem } from '../../api/client';
import { Typography } from '../../constants/theme';

export type ExploreGridItem = ExploreServiceItem;

export interface ExploreServicesGridProps {
  services?: ExploreServiceItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onSelectService?: (item: ExploreServiceItem) => void;
  onViewAllPress?: () => void;
}

// ─── Individual 3-Grid Card Component (Prompt 1) ─────────────────────────────
interface ExploreServiceCardProps {
  item: ExploreServiceItem;
  cardWidth: number;
  onPress: (item: ExploreServiceItem) => void;
}

function ExploreServiceCard({ item, cardWidth, onPress }: ExploreServiceCardProps) {
  const [imageError, setImageError] = useState(false);

  const hasDiscount =
    item.originalPrice != null && Number(item.originalPrice) > Number(item.price);
  const discountPercent = hasDiscount
    ? Math.round(
        ((Number(item.originalPrice) - Number(item.price)) / Number(item.originalPrice)) * 100
      )
    : 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardContainer,
        { width: cardWidth },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, Price: ₹${item.price}`}
    >
      {/* 1. Image & Badges Overlay (Aspect Ratio 1:1, borderRadius: 10) */}
      <View style={styles.imageWrapper}>
        {item.imageUrl && !imageError ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
            transition={150}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="briefcase-outline" size={24} color="#94A3B8" />
          </View>
        )}

        {/* Discount Badge: Top-Right, Primary Blue (#2563EB) */}
        {discountPercent > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercent}% OFF</Text>
          </View>
        )}

        {/* Rating Badge: Bottom-Left, Semi-transparent Black */}
        {item.rating != null && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={9} color="#F59E0B" style={{ marginRight: 2.5 }} />
            <Text style={styles.ratingText}>
              {Number(item.rating).toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {/* 2. Card Typography */}
      {/* Category Label: uppercase, fontSize: 9, color: #64748B */}
      {item.categoryName ? (
        <Text style={styles.categoryLabel} numberOfLines={1}>
          {item.categoryName}
        </Text>
      ) : null}

      {/* Title: fontSize: 12, fontWeight: '700', lines: 2, height: 32 */}
      <Text style={styles.serviceTitle} numberOfLines={2}>
        {item.name}
      </Text>

      {/* Price Row: current price in #2563EB, original in #94A3B8 with strikethrough */}
      <View style={styles.priceRow}>
        <Text style={styles.currentPriceText}>
          ₹{Number(item.price).toLocaleString('en-IN')}
        </Text>
        {hasDiscount && (
          <Text style={styles.originalPriceText}>
            ₹{Number(item.originalPrice).toLocaleString('en-IN')}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ─── Main Explore Services 3-Grid Component ──────────────────────────────────
export function ExploreServicesGrid({
  services = [],
  isLoading = false,
  isError = false,
  onRetry,
  onSelectService,
  onViewAllPress,
}: ExploreServicesGridProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Dynamic 3-Column card width: (width - 32 padding - 16 gap) / 3
  const cardWidth = Math.floor((screenWidth - 32 - 16) / 3);

  const handleItemPress = (item: ExploreServiceItem) => {
    if (onSelectService) {
      onSelectService(item);
      return;
    }

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

  const handleViewAll = () => {
    if (onViewAllPress) {
      onViewAllPress();
    } else {
      router.push('/(tabs)/categories');
    }
  };

  const activeServices = services.filter((s) => s.isActive !== false);

  return (
    <View style={styles.container}>
      {/* ── Header Section (Prompt 2) ─────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={18} color="#2563EB" style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle}>Explore Services</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.viewAllBtn, pressed && styles.pressedText]}
          onPress={handleViewAll}
          accessibilityRole="button"
          accessibilityLabel="View All Services"
        >
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {/* ── Loading Skeleton (3-Grid) ─────────────────────────────── */}
      {isLoading && (
        <View style={styles.skeletonWrapper}>
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <View
              key={`skeleton-${key}`}
              style={[styles.skeletonCard, { width: cardWidth }]}
            >
              <View style={[styles.skeletonImage, { width: cardWidth, height: cardWidth }]}>
                <ActivityIndicator size="small" color="#94A3B8" />
              </View>
              <View style={styles.skeletonBody}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineLong} />
                <View style={styles.skeletonLinePrice} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Error State with Retry ──────────────────────────────────── */}
      {!isLoading && isError && (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.stateTitle}>Unable to load explore services</Text>
          <Text style={styles.stateSub}>Please check your connection and try again.</Text>
          {onRetry && (
            <Pressable
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressedText]}
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry loading services"
            >
              <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Empty State ─────────────────────────────────────────────── */}
      {!isLoading && !isError && activeServices.length === 0 && (
        <View style={styles.stateContainer}>
          <Ionicons name="layers-outline" size={32} color="#94A3B8" />
          <Text style={styles.stateTitle}>No services available</Text>
          <Text style={styles.stateSub}>Check back later or browse all categories.</Text>
          <Pressable
            style={({ pressed }) => [styles.browseButton, pressed && styles.pressedText]}
            onPress={handleViewAll}
            accessibilityRole="button"
            accessibilityLabel="Browse All Categories"
          >
            <Text style={styles.browseButtonText}>Browse All Categories</Text>
          </Pressable>
        </View>
      )}

      {/* ── 3-Column FlatList Grid (Prompt 1) ────────────────────────── */}
      {!isLoading && !isError && activeServices.length > 0 && (
        <FlatList
          data={activeServices}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.flatListContent}
          scrollEnabled={false}
          nestedScrollEnabled={true}
          renderItem={({ item }) => (
            <ExploreServiceCard
              item={item}
              cardWidth={cardWidth}
              onPress={handleItemPress}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 16,
  },
  /* Header Section */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    fontWeight: '600',
    color: '#2563EB',
  },
  pressedText: {
    opacity: 0.7,
  },

  /* FlatList 3-Grid Configuration */
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  flatListContent: {
    gap: 12,
  },

  /* Card Container */
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    paddingBottom: 8,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.97 }],
  },

  /* Image & Overlays */
  imageWrapper: {
    position: 'relative',
    aspectRatio: 1,
    width: '100%',
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    borderRadius: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F6',
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  discountText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  ratingText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.semiBold,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* Typography */
  categoryLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.semiBold,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  serviceTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    paddingHorizontal: 6,
    height: 32, // Consistent line-height & height prevents misaligned rows
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 6,
  },
  currentPriceText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#2563EB',
  },
  originalPriceText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },

  /* Skeleton Loading */
  skeletonWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingBottom: 8,
  },
  skeletonImage: {
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  skeletonBody: {
    padding: 6,
    gap: 4,
  },
  skeletonLineShort: {
    height: 8,
    width: '60%',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginTop: 4,
  },
  skeletonLineLong: {
    height: 12,
    width: '90%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonLinePrice: {
    height: 10,
    width: '45%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 2,
  },

  /* Error & Empty States */
  stateContainer: {
    marginHorizontal: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stateTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 4,
  },
  stateSub: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  browseButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#2563EB',
  },
});
