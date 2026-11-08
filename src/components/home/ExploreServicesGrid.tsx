import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ExploreServiceItem } from '../../api/client';
import { Typography } from '../../constants/theme';

export type ExploreGridItem = ExploreServiceItem;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 12;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2);
const IMAGE_HEIGHT = 110;

export interface ExploreServicesGridProps {
  services?: ExploreServiceItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onSelectService?: (item: ExploreServiceItem) => void;
  onViewAllPress?: () => void;
}

export function ExploreServicesGrid({
  services = [],
  isLoading = false,
  isError = false,
  onRetry,
  onSelectService,
  onViewAllPress,
}: ExploreServicesGridProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleItemPress = (item: ExploreServiceItem) => {
    if (onSelectService) {
      onSelectService(item);
      return;
    }

    // Default route: Navigate to category or service details
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
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={18} color="#0052FF" style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle}>Explore Services</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.viewAllBtn, pressed && styles.pressedText]}
          onPress={handleViewAll}
          accessibilityRole="button"
          accessibilityLabel="View All Services"
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="arrow-forward" size={14} color="#0052FF" style={{ marginLeft: 4 }} />
        </Pressable>
      </View>

      {/* ── Loading Skeleton ────────────────────────────────────────── */}
      {isLoading && (
        <View style={styles.gridContainer}>
          {[1, 2, 3, 4].map((key) => (
            <View key={`skeleton-${key}`} style={[styles.skeletonCard, { width: CARD_WIDTH }]}>
              <View style={styles.skeletonImage}>
                <ActivityIndicator size="small" color="#94A3B8" />
              </View>
              <View style={styles.skeletonBody}>
                <View style={styles.skeletonLineLong} />
                <View style={styles.skeletonLineShort} />
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

      {/* ── Dynamic Grid ────────────────────────────────────────────── */}
      {!isLoading && !isError && activeServices.length > 0 && (
        <View style={styles.gridContainer}>
          {activeServices.map((item) => {
            const hasDiscount =
              item.originalPrice != null && Number(item.originalPrice) > Number(item.price);
            const discountPercent = hasDiscount
              ? Math.round(
                  ((Number(item.originalPrice) - Number(item.price)) / Number(item.originalPrice)) * 100
                )
              : 0;

            const isImgErr = imageErrors[item.id];

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.cardPressable,
                  { width: CARD_WIDTH },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => handleItemPress(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, Price: ₹${item.price}`}
              >
                {/* Image Container with Badges */}
                <View style={styles.imageWrapper}>
                  {item.imageUrl && !isImgErr ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.cardImage}
                      contentFit="cover"
                      transition={200}
                      onError={() =>
                        setImageErrors((prev) => ({ ...prev, [item.id]: true }))
                      }
                    />
                  ) : (
                    <View style={styles.imageFallback}>
                      <Ionicons name="briefcase-outline" size={28} color="#94A3B8" />
                    </View>
                  )}

                  {/* Rating Badge */}
                  {item.rating != null && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={10} color="#F59E0B" style={{ marginRight: 3 }} />
                      <Text style={styles.ratingText}>
                        {Number(item.rating).toFixed(1)}
                        {item.reviewCount ? ` (${item.reviewCount})` : ''}
                      </Text>
                    </View>
                  )}

                  {/* Discount Badge */}
                  {discountPercent > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                    </View>
                  )}
                </View>

                {/* Card Details */}
                <View style={styles.detailsContainer}>
                  {item.categoryName ? (
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {item.categoryName}
                    </Text>
                  ) : null}

                  <Text style={styles.serviceName} numberOfLines={2}>
                    {item.name}
                  </Text>

                  {/* Pricing Row */}
                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>
                      ₹{Number(item.price).toLocaleString('en-IN')}
                    </Text>
                    {hasDiscount && (
                      <Text style={styles.originalPriceText}>
                        ₹{Number(item.originalPrice).toLocaleString('en-IN')}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
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
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0052FF',
  },
  pressedText: {
    opacity: 0.7,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: COLUMN_GAP,
    rowGap: 14,
  },
  cardPressable: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  imageWrapper: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F6',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#0052FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  detailsContainer: {
    padding: 10,
  },
  categoryName: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  serviceName: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0052FF',
  },
  originalPriceText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  /* Skeleton Loading */
  skeletonCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skeletonImage: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonBody: {
    padding: 10,
    gap: 6,
  },
  skeletonLineLong: {
    height: 12,
    width: '90%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonLineShort: {
    height: 10,
    width: '50%',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  skeletonLinePrice: {
    height: 12,
    width: '40%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 4,
  },
  /* Error / Empty States */
  stateContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
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
    backgroundColor: '#0052FF',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  browseButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0052FF',
  },
});
