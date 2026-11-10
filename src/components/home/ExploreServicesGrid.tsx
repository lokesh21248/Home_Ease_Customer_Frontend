import React, { useMemo } from 'react';
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
  localImage: any;
  defaultCategoryId?: string;
  keywords: string[];
}

export const MASTER_SERVICES: CuratedHomeService[] = [
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
    displayName: 'AC Service\n& Repair',
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
    id: 'pest-control',
    name: 'Pest Control',
    displayName: 'Pest\nControl',
    rating: 4.9,
    ratingCount: '(17.9K)',
    localImage: require('../../../assets/images/services/pest_control_thumb.png'),
    keywords: ['pest', 'termite', 'cockroach', 'bug'],
  },
  {
    id: 'painting',
    name: 'Painting (Home/Office)',
    displayName: 'Painting\n(Home/Office)',
    rating: 4.9,
    ratingCount: '(21.7K)',
    localImage: require('../../../assets/images/services/painting_thumb.png'),
    keywords: ['paint', 'color', 'wall'],
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
  {
    id: 'carpentry-service',
    name: 'Carpentry Service',
    displayName: 'Carpentry\nService',
    rating: 4.8,
    ratingCount: '(11.9K)',
    localImage: require('../../../assets/images/services/carpentry_thumb.png'),
    keywords: ['carpent', 'wood', 'furniture', 'door'],
  },
];

interface ExploreCardItem extends CuratedHomeService {
  resolvedId: string;
  resolvedCategoryId?: string;
  backendItem?: ExploreServiceItem;
}

export function ExploreServicesGrid({
  services = [],
  isLoading = false,
  isError = false,
  onRetry,
  onSelectService,
  onViewAllPress,
}: ExploreServicesGridProps) {
  const { width: screenWidth } = useWindowDimensions();

  // 4 columns: 32 total padding (16 left, 16 right) + 3 gaps of 8px (24px)
  const cardWidth = Math.floor((screenWidth - 32 - 24) / 4);

  // Map backend services to curated master list to retain high-res assets & live IDs
  const displayItems = useMemo<ExploreCardItem[]>(() => {
    return MASTER_SERVICES.map((curated) => {
      // Find matching backend item if available
      const match = services.find((s) => {
        const nameLower = (s.name || '').toLowerCase();
        return (
          nameLower === curated.name.toLowerCase() ||
          curated.keywords.some((k) => nameLower.includes(k))
        );
      });

      return {
        ...curated,
        resolvedId: match?.id || curated.id,
        resolvedCategoryId: match?.categoryId || curated.defaultCategoryId,
        price: curated.price ?? (match?.price ? Number(match.price) : undefined),
        originalPrice:
          curated.originalPrice ??
          (match?.originalPrice ? Number(match.originalPrice) : undefined),
        backendItem: match,
      };
    });
  }, [services]);

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

    // Default: route to categories tab or targeted service search
    router.push({
      pathname: '/(tabs)/categories',
      params: { search: item.name },
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
      {/* Section Header: Explore Services & View All → */}
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
          <Text style={styles.loadingText}>Loading services...</Text>
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
        /* 4-Column Grid */
        <View style={styles.gridContainer}>
          {displayItems.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                { width: cardWidth },
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleCardPress(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, rating: ${item.rating}`}
            >
              {/* 1. Star Rating Row: ⭐ 4.9 (48.3K) */}
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={9.5} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {item.rating}{' '}
                  <Text style={styles.ratingCountText}>{item.ratingCount}</Text>
                </Text>
              </View>

              {/* 2. Image with Circular Plus Button */}
              <View style={styles.imageContainer}>
                <Image
                  source={item.localImage}
                  style={styles.cardImage}
                  contentFit="contain"
                  transition={120}
                />
                {/* Circular White Plus Button */}
                <View style={styles.plusButton}>
                  <Ionicons name="add" size={13} color="#0052FF" />
                </View>
              </View>

              {/* 3. Service Name */}
              <Text style={styles.serviceName} numberOfLines={2}>
                {item.displayName}
              </Text>

              {/* 4. Optional Price Row (e.g. Cooking ₹49 strikethrough ₹99) */}
              {item.price ? (
                <View style={styles.priceRow}>
                  <Text style={styles.currentPriceText}>₹{item.price}</Text>
                  {item.originalPrice ? (
                    <Text style={styles.originalPriceText}>
                      ₹{item.originalPrice}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0052FF',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    paddingVertical: 7,
    paddingHorizontal: 5,
    marginBottom: 8,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1F2937',
  },
  ratingCountText: {
    fontSize: 8,
    fontWeight: '500',
    color: '#64748B',
  },
  imageContainer: {
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  cardImage: {
    width: 48,
    height: 48,
  },
  plusButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 13,
    marginTop: 2,
    paddingHorizontal: 2,
    minHeight: 26,
    textAlign: 'left',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
    paddingHorizontal: 2,
  },
  currentPriceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  originalPriceText: {
    fontSize: 9.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  loadingContainer: {
    paddingVertical: 24,
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
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
