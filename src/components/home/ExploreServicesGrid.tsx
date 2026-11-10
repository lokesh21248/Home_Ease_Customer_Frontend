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
  localImage: any;
  defaultCategoryId: string;
  keywords: string[];
}

// Backend Category UUIDs
const CATEGORY_IDS = {
  CLEANING: 'be8bb640-cc11-4243-ab4a-5cbdf34a0937',
  AC: '9b7f941c-ee83-4ffe-bd1d-2dacba5d4760',
  ELECTRICIAN: '6e2e370b-7d5e-46d2-944b-afe7c15db6d5',
  MASSAGE_HANDYMAN: '6beaaf16-cb8b-4107-9f8b-617b23c0bd21',
};

/**
 * Curated 12 Master Services matching HomeEase visual design.
 * Order 1-9 matches the master 3x3 grid screenshot:
 *  Row 1: Daily Home Cleaning, HomeEase Verified, Cooking
 *  Row 2: Sofa & Carpet Cleaning, AC Service & Repair, Appliance Repair
 *  Row 3: Bathroom Cleaning, Pest Control, Plumbing Service
 *  Row 4 (view all / full list): Painting, Electrician Service, Carpentry Service
 */
export const MASTER_FALLBACK_SERVICES: CuratedHomeService[] = [
  {
    id: 'daily-home-cleaning',
    name: 'Daily Home Cleaning',
    displayName: 'Daily Home\nCleaning',
    rating: 4.9,
    ratingCount: '(48.3K)',
    localImage: require('../../../assets/images/services/daily_cleaning_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.CLEANING,
    keywords: ['daily home', 'home cleaning', 'maid', 'deep cleaning'],
  },
  {
    id: 'homeease-verified',
    name: 'HomeEase Verified',
    displayName: 'HomeEase\nVerified',
    rating: 4.9,
    ratingCount: '(79.0K)',
    localImage: require('../../../assets/images/services/verified_worker_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.CLEANING,
    keywords: ['verified', 'partner', 'pro', 'expert'],
  },
  {
    id: 'cooking',
    name: 'Cooking',
    displayName: 'Cooking',
    rating: 4.9,
    ratingCount: '(79.0K)',
    localImage: require('../../../assets/images/services/cooking_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.CLEANING,
    keywords: ['cooking', 'cook', 'chef', 'food', 'meal'],
  },
  {
    id: 'sofa-carpet-cleaning',
    name: 'Sofa & Carpet Cleaning',
    displayName: 'Sofa & Carpet\nCleaning',
    rating: 4.8,
    ratingCount: '(32.1K)',
    localImage: require('../../../assets/images/services/sofa_carpet_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.CLEANING,
    keywords: ['sofa', 'carpet', 'couch', 'upholstery', 'mat'],
  },
  {
    id: 'ac-service-repair',
    name: 'AC Service & Repair',
    displayName: 'AC Service &\nRepair',
    rating: 4.9,
    ratingCount: '(52.4K)',
    localImage: require('../../../assets/images/services/ac_repair_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.AC,
    keywords: ['ac ', 'ac deep', 'air conditioning', 'cooling'],
  },
  {
    id: 'appliance-repair',
    name: 'Appliance Repair',
    displayName: 'Appliance\nRepair',
    rating: 4.8,
    ratingCount: '(40.0K)',
    localImage: require('../../../assets/images/services/appliance_repair_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.ELECTRICIAN,
    keywords: ['appliance', 'washing', 'fridge', 'refrigerator', 'microwave'],
  },
  {
    id: 'bathroom-cleaning',
    name: 'Bathroom Cleaning',
    displayName: 'Bathroom\nCleaning',
    rating: 4.9,
    ratingCount: '(28.6K)',
    localImage: require('../../../assets/images/services/bathroom_cleaning_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.CLEANING,
    keywords: ['bathroom', 'descale', 'toilet', 'washroom'],
  },
  {
    id: 'pest-control',
    name: 'Pest Control',
    displayName: 'Pest\nControl',
    rating: 4.9,
    ratingCount: '(17.9K)',
    localImage: require('../../../assets/images/services/pest_control_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.CLEANING,
    keywords: ['pest', 'termite', 'cockroach', 'mosquito', 'insect'],
  },
  {
    id: 'plumbing-service',
    name: 'Plumbing Service',
    displayName: 'Plumbing\nService',
    rating: 4.8,
    ratingCount: '(11.9K)',
    localImage: require('../../../assets/images/services/plumbing_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.MASSAGE_HANDYMAN,
    keywords: ['plumbing', 'pipe', 'tap', 'leak', 'drain', 'sink'],
  },
  {
    id: 'painting',
    name: 'Painting (Home/Office)',
    displayName: 'Painting\n(Home/Office)',
    rating: 4.9,
    ratingCount: '(21.7K)',
    localImage: require('../../../assets/images/services/painting_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.CLEANING,
    keywords: ['paint', 'color', 'whitewash', 'wall'],
  },
  {
    id: 'electrician-service',
    name: 'Electrician Service',
    displayName: 'Electrician\nService',
    rating: 4.8,
    ratingCount: '(15.6K)',
    localImage: require('../../../assets/images/services/electrician_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.ELECTRICIAN,
    keywords: ['electr', 'switch', 'socket', 'wire', 'fan'],
  },
  {
    id: 'carpentry-service',
    name: 'Carpentry Service',
    displayName: 'Carpentry\nService',
    rating: 4.8,
    ratingCount: '(11.9K)',
    localImage: require('../../../assets/images/services/carpentry_thumb.png'),
    defaultCategoryId: CATEGORY_IDS.ELECTRICIAN,
    keywords: ['carpenter', 'wood', 'furniture', 'door', 'lock', 'drill'],
  },
];

interface ExploreCardItem {
  key: string;
  id: string;
  name: string;
  displayName: string;
  rating: number;
  ratingCount: string;
  imageUrl?: string;
  localImage?: any;
  resolvedId: string;
  resolvedCategoryId?: string;
  backendItem?: ExploreServiceItem;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // Directly map live API data from backend /explore-services endpoint while maintaining exact master visual order
  const displayItems = useMemo<ExploreCardItem[]>(() => {
    const usedBackendIds = new Set<string>();

    return MASTER_FALLBACK_SERVICES.slice(0, maxItems).map((curated, index) => {
      // Find matching backend item if live data exists without duplicates
      const backendMatch = services.find((s) => {
        if (!s || !s.id || usedBackendIds.has(s.id)) return false;
        const sName = (s.name || '').toLowerCase();
        return curated.keywords.some((k) => sName.includes(k));
      });

      if (backendMatch) {
        usedBackendIds.add(backendMatch.id);
        const revCount = backendMatch.reviewCount ?? 0;
        const formattedRevCount =
          revCount > 999
            ? `(${(revCount / 1000).toFixed(1)}K)`
            : revCount > 0
            ? `(${revCount})`
            : curated.ratingCount;

        return {
          key: `curated-${curated.id}-${backendMatch.id}-${index}`,
          id: backendMatch.id,
          name: backendMatch.name,
          displayName: curated.displayName,
          rating: backendMatch.rating != null ? Number(backendMatch.rating) : curated.rating,
          ratingCount: formattedRevCount,
          imageUrl: backendMatch.imageUrl,
          localImage: curated.localImage,
          resolvedId: backendMatch.id,
          resolvedCategoryId: backendMatch.categoryId || curated.defaultCategoryId,
          backendItem: backendMatch,
        };
      }

      return {
        key: `curated-${curated.id}-${index}`,
        id: curated.id,
        name: curated.name,
        displayName: curated.displayName,
        rating: curated.rating,
        ratingCount: curated.ratingCount,
        localImage: curated.localImage,
        resolvedId: curated.id,
        resolvedCategoryId: curated.defaultCategoryId,
      };
    });
  }, [services, maxItems]);

  const handleCardPress = (item: ExploreCardItem) => {
    // 1. HomeEase Verified links directly to the full category directory
    if (item.id === 'homeease-verified') {
      router.push('/(tabs)/categories');
      return;
    }

    // 2. Custom parent handler
    if (onSelectService && item.backendItem) {
      onSelectService(item.backendItem);
      return;
    }

    // 3. Category navigation with validated UUID
    if (item.resolvedCategoryId && UUID_REGEX.test(item.resolvedCategoryId)) {
      router.push({
        pathname: '/category/[id]',
        params: { id: item.resolvedCategoryId, name: item.name },
      });
      return;
    }

    // 4. Service details navigation ONLY if resolvedId is a valid backend UUID
    if (UUID_REGEX.test(item.resolvedId)) {
      router.push({
        pathname: '/service/[id]',
        params: {
          id: item.resolvedId,
          name: item.name,
          image: item.imageUrl,
        },
      });
      return;
    }

    // 5. Safe fallback to categories tab to avoid 400 Bad Request
    router.push('/(tabs)/categories');
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
      {/* Header row: Left Blue Bar + "Explore Services" + Right "View All →" */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <View style={styles.titleAccentBar} />
          <Text style={styles.sectionTitle}>Explore Services</Text>
        </View>

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
        /* 3-Column Grid from Live API Data with direct inlined cards (prevents wrap-jsx unexported component crash) */
        <View style={styles.gridContainer}>
          {displayItems.map((item, index) => {
            const isRightmostCol = index % 3 === 2;

            return (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.card,
                  {
                    width: cardWidth,
                    marginRight: isRightmostCol ? 0 : GAP,
                    marginBottom: GAP + 2,
                  },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => handleCardPress(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, rating: ${item.rating}`}
              >
                {/* 1. Star Rating Row: ⭐ 4.9 (48.3K) at Top Left */}
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.ratingScore}>{item.rating}</Text>
                  <Text style={styles.ratingCount}>{item.ratingCount}</Text>
                </View>

                {/* 2. Centered Service Image */}
                <View style={styles.imageContainer}>
                  {item.localImage ? (
                    <Image
                      source={item.localImage}
                      style={styles.cardImage}
                      contentFit="contain"
                      transition={100}
                    />
                  ) : item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.cardImage}
                      contentFit="contain"
                      transition={100}
                    />
                  ) : (
                    <View style={styles.imageFallback}>
                      <Ionicons name="sparkles" size={24} color="#0052FF" />
                    </View>
                  )}
                </View>

                {/* 3. Bottom Row: Service Title on Left + Circular (+) Button on Right */}
                <View style={styles.bottomRow}>
                  <Text style={styles.serviceName} numberOfLines={2} ellipsizeMode="tail">
                    {item.displayName || item.name}
                  </Text>

                  <View style={styles.plusCircle}>
                    <Ionicons name="add" size={15} color="#0052FF" />
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleAccentBar: {
    width: 3.5,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#0052FF',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#0F172A',
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
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 8,
    minHeight: 148,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 16,
  },
  ratingScore: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#111827',
  },
  ratingCount: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#64748B',
  },
  imageContainer: {
    height: 64,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  cardImage: {
    width: 58,
    height: 58,
  },
  imageFallback: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
    marginTop: 2,
  },
  serviceName: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 15,
    paddingRight: 4,
  },
  plusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0052FF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
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
