import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ExploreServiceItem } from '../../api/client';

export type ExploreGridItem = ExploreServiceItem;

export interface ExploreServicesGridProps {
  services?: ExploreServiceItem[];
  isLoading?: boolean;
  isError?: boolean;
  maxItems?: number; // Defaults to 9 for 3x3 layout
  onRetry?: () => void;
  onSelectService?: (item: ExploreServiceItem) => void;
  onViewAllPress?: () => void;
}

interface CuratedHomeService {
  id: string;
  name: string;
  displayName: string;
  rating: number;
  ratingCount: string;
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  localImage?: any;
  defaultCategoryId?: string;
  keywords: string[];
}

// Curated fallbacks in case of network drop or offline mode
export const MASTER_FALLBACK_SERVICES: CuratedHomeService[] = [
  {
    id: 'daily-home-cleaning',
    name: 'Daily Home Cleaning',
    displayName: 'Daily Home\nCleaning',
    rating: 4.9,
    ratingCount: '(48.3K)',
    localImage: require('../../../assets/images/services/daily_cleaning_thumb.png'),
    keywords: ['clean', 'daily', 'maid', 'home cleaning'],
  },
  {
    id: 'homeease-verified',
    name: 'HomeEase Verified',
    displayName: 'HomeEase\nVerified',
    rating: 4.9,
    ratingCount: '(79.0K)',
    localImage: require('../../../assets/images/services/verified_worker_thumb.png'),
    keywords: ['verified', 'partner', 'pro'],
  },
  {
    id: 'cooking',
    name: 'Cooking',
    displayName: 'Cooking',
    rating: 4.9,
    ratingCount: '(79.0K)',
    price: 49,
    originalPrice: 99,
    localImage: require('../../../assets/images/services/cooking_thumb.png'),
    keywords: ['cook', 'chef', 'food', 'kitchen'],
  },
  {
    id: 'sofa-carpet-cleaning',
    name: 'Sofa & Carpet Cleaning',
    displayName: 'Sofa & Carpet\nCleaning',
    rating: 4.8,
    ratingCount: '(32.1K)',
    localImage: require('../../../assets/images/services/sofa_carpet_thumb.png'),
    keywords: ['sofa', 'carpet', 'couch', 'upholstery'],
  },
  {
    id: 'ac-service-repair',
    name: 'AC Service & Repair',
    displayName: 'AC Service &\nRepair',
    rating: 4.9,
    ratingCount: '(52.4K)',
    localImage: require('../../../assets/images/services/ac_repair_thumb.png'),
    keywords: ['ac', 'air', 'cooling', 'hvac'],
  },
  {
    id: 'appliance-repair',
    name: 'Appliance Repair',
    displayName: 'Appliance\nRepair',
    rating: 4.8,
    ratingCount: '(40.0K)',
    localImage: require('../../../assets/images/services/appliance_repair_thumb.png'),
    keywords: ['appliance', 'washing', 'fridge', 'microwave'],
  },
  {
    id: 'bathroom-cleaning',
    name: 'Bathroom Cleaning',
    displayName: 'Bathroom\nCleaning',
    rating: 4.9,
    ratingCount: '(28.6K)',
    localImage: require('../../../assets/images/services/bathroom_cleaning_thumb.png'),
    keywords: ['bath', 'toilet', 'washroom'],
  },
  {
    id: 'electrician-service',
    name: 'Electrician Service',
    displayName: 'Electrician\nService',
    rating: 4.8,
    ratingCount: '(15.6K)',
    localImage: require('../../../assets/images/services/electrician_thumb.png'),
    keywords: ['electr', 'switch', 'socket', 'wire', 'fan'],
  },
  {
    id: 'plumbing-service',
    name: 'Plumbing Service',
    displayName: 'Plumbing\nService',
    rating: 4.9,
    ratingCount: '(12.3K)',
    localImage: require('../../../assets/images/services/plumbing_thumb.png'),
    keywords: ['plumb', 'pipe', 'tap', 'leak', 'drain'],
  },
];

interface ExploreCardItem {
  id: string;
  name: string;
  displayName: string;
  rating: number;
  ratingCount: string;
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  localImage?: any;
  resolvedId: string;
  resolvedCategoryId?: string;
  backendItem?: ExploreServiceItem;
}

// Subcomponent for each service card to track image errors independently
function ServiceGridCard({
  item,
  cardWidth,
  onPress,
}: {
  item: ExploreCardItem;
  cardWidth: number;
  onPress: (item: ExploreCardItem) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const hasDiscount =
    item.originalPrice != null &&
    item.price != null &&
    Number(item.originalPrice) > Number(item.price);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, rating: ${item.rating}`}
    >
      {/* 1. Star Rating Row: ⭐ 4.9 (142) */}
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={10.5} color="#F59E0B" />
        <Text style={styles.ratingText}>
          {item.rating}{' '}
          <Text style={styles.ratingCountText}>{item.ratingCount}</Text>
        </Text>
      </View>

      {/* 2. Image with Circular Plus Button */}
      <View style={styles.imageContainer}>
        {item.imageUrl && !imageFailed ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardImageCover}
            contentFit="cover"
            transition={150}
            onError={() => setImageFailed(true)}
          />
        ) : item.localImage ? (
          <Image
            source={item.localImage}
            style={styles.cardImage}
            contentFit="contain"
            transition={120}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="sparkles" size={26} color="#0052FF" />
          </View>
        )}

        {/* Circular White Plus Button with Blue Icon */}
        <View style={styles.plusButton}>
          <Ionicons name="add" size={14} color="#0052FF" />
        </View>
      </View>

      {/* 3. Service Name (2 lines max, bold navy) */}
      <Text style={styles.serviceName} numberOfLines={2}>
        {item.displayName || item.name}
      </Text>

      {/* 4. Price Row with original price strikethrough if discounted */}
      {item.price != null ? (
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
      ) : (
        <View style={styles.priceRowPlaceholder} />
      )}
    </Pressable>
  );
}

export function ExploreServicesGrid({
  services = [],
  isLoading = false,
  isError = false,
  maxItems = 9,
  onRetry,
  onSelectService,
  onViewAllPress,
}: ExploreServicesGridProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Exact 3-column calculation: 32 total padding (16 left, 16 right) + 2 gaps of 10px (20px total gap)
  const GAP = 10;
  const cardWidth = Math.floor((screenWidth - 32 - (2 * GAP)) / 3);

  // Directly map live API data from backend /explore-services endpoint
  const displayItems = useMemo<ExploreCardItem[]>(() => {
    if (services && services.length > 0) {
      return services.slice(0, maxItems).map((s) => {
        // Look up local fallback thumbnail if available
        const sName = (s.name || '').toLowerCase();
        const fallback = MASTER_FALLBACK_SERVICES.find((f) =>
          f.keywords.some((k) => sName.includes(k))
        );

        const revCount = s.reviewCount ?? 0;
        const formattedRevCount =
          revCount > 999
            ? `(${(revCount / 1000).toFixed(1)}K)`
            : revCount > 0
            ? `(${revCount})`
            : fallback?.ratingCount || '(50+)';

        return {
          id: s.id,
          name: s.name,
          displayName: s.name,
          rating: s.rating != null ? Number(s.rating) : fallback?.rating ?? 4.9,
          ratingCount: formattedRevCount,
          price: s.price != null ? Number(s.price) : fallback?.price,
          originalPrice:
            s.originalPrice != null ? Number(s.originalPrice) : fallback?.originalPrice,
          imageUrl: s.imageUrl,
          localImage: fallback?.localImage,
          resolvedId: s.id,
          resolvedCategoryId: s.categoryId,
          backendItem: s,
        };
      });
    }

    // Fallback when API returns empty (offline or initial loading)
    return MASTER_FALLBACK_SERVICES.slice(0, maxItems).map((curated) => ({
      ...curated,
      resolvedId: curated.id,
      resolvedCategoryId: curated.defaultCategoryId,
    }));
  }, [services, maxItems]);

  const handleCardPress = (item: ExploreCardItem) => {
    if (onSelectService && item.backendItem) {
      onSelectService(item.backendItem);
      return;
    }

    if (item.resolvedCategoryId) {
      router.push({
        pathname: '/category/[id]',
        params: { id: item.resolvedCategoryId, name: item.name },
      });
      return;
    }

    router.push({
      pathname: '/service/[id]',
      params: {
        id: item.resolvedId,
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

  return (
    <View style={styles.container}>
      {/* Header row: Explore Services (bold navy) + View All → button (linking to Categories) */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Explore Services</Text>
        <Pressable
          onPress={handleViewAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="View all explore services"
        >
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {/* Loading indicator */}
      {isLoading && services.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0052FF" />
          <Text style={styles.loadingText}>Loading explore services...</Text>
        </View>
      ) : isError && services.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load latest services.</Text>
          {onRetry && (
            <Pressable style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          )}
        </View>
      ) : (
        /* 3-Column Grid from Live API Data */
        <View style={styles.gridContainer}>
          {displayItems.map((item) => (
            <ServiceGridCard
              key={item.id}
              item={item}
              cardWidth={cardWidth}
              onPress={handleCardPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#0F172A', // Bold navy
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0052FF',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    paddingVertical: 9,
    paddingHorizontal: 8,
    marginBottom: 10,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1F2937',
  },
  ratingCountText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#64748B',
  },
  imageContainer: {
    height: 64,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  cardImageCover: {
    width: '100%',
    height: 60,
    borderRadius: 10,
  },
  cardImage: {
    width: 54,
    height: 54,
  },
  imageFallback: {
    width: '100%',
    height: 60,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButton: {
    position: 'absolute',
    right: 0,
    bottom: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A', // Bold navy
    lineHeight: 15,
    marginTop: 4,
    minHeight: 30,
    textAlign: 'left',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 3,
  },
  priceRowPlaceholder: {
    height: 16,
  },
  currentPriceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  originalPriceText: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  loadingContainer: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  retryButton: {
    backgroundColor: '#0052FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  retryText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
