import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ServiceCategory } from '../../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 4-column calculation
const HORIZONTAL_PADDING = 14;
const COLUMN_GAP = 8;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP * 3) / 4);

export interface ExploreGridItem {
  id: string;
  title: string;
  rating: string;
  image: string;
  price?: string;
  originalPrice?: string;
  categoryMatch?: string;
}

export const EXPLORE_SERVICES_12: ExploreGridItem[] = [
  {
    id: 'daily-home-cleaning',
    title: 'Daily Home\nCleaning',
    rating: '4.9 (48.3K)',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'Cleaning',
  },
  {
    id: 'homeease-verified',
    title: 'HomeEase\nVerified',
    rating: '4.9 (79.0K)',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'Cleaning',
  },
  {
    id: 'cooking',
    title: 'Cooking',
    rating: '4.9 (79.0K)',
    price: '₹49',
    originalPrice: '₹99',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'Cooking',
  },
  {
    id: 'sofa-carpet-cleaning',
    title: 'Sofa & Carpet\nCleaning',
    rating: '4.8 (32.1K)',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'Cleaning',
  },
  {
    id: 'ac-service-repair',
    title: 'AC Service\n& Repair',
    rating: '4.9 (52.4K)',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'AC Service & Repair',
  },
  {
    id: 'appliance-repair',
    title: 'Appliance\nRepair',
    rating: '4.8 (40.0K)',
    image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'Appliance Repair',
  },
  {
    id: 'bathroom-cleaning',
    title: 'Bathroom\nCleaning',
    rating: '4.9 (28.6K)',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'Cleaning',
  },
  {
    id: 'pest-control',
    title: 'Pest\nControl',
    rating: '4.9 (17.9K)',
    image: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'Pest Control',
  },
  {
    id: 'painting-home-office',
    title: 'Painting\n(Home/Office)',
    rating: '4.9 (21.7K)',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'Painting',
  },
  {
    id: 'electrician-service',
    title: 'Electrician\nService',
    rating: '4.8 (15.6K)',
    image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'Electrician Services',
  },
  {
    id: 'plumbing-service',
    title: 'Plumbing\nService',
    rating: '4.9 (12.3K)',
    image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'Plumbing',
  },
  {
    id: 'carpentry-service',
    title: 'Carpentry\nService',
    rating: '4.8 (11.9K)',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&auto=format&fit=crop&q=80',
    categoryMatch: 'Carpentry',
  },
];

interface ExploreServicesGridProps {
  categories?: ServiceCategory[];
  onSelectService?: (item: ExploreGridItem) => void;
  onViewAllPress?: () => void;
}

export function ExploreServicesGrid({
  categories = [],
  onSelectService,
  onViewAllPress,
}: ExploreServicesGridProps) {
  const handleItemPress = (item: ExploreGridItem) => {
    if (onSelectService) {
      onSelectService(item);
      return;
    }

    // Attempt to match with real backend category
    if (categories.length > 0 && item.categoryMatch) {
      const matched = categories.find(
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

    // Default route
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
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Explore Services</Text>
        <Pressable
          style={({ pressed }) => [styles.viewAllBtn, pressed && styles.pressedText]}
          onPress={handleViewAll}
          accessibilityRole="button"
          accessibilityLabel="View All Services"
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="arrow-forward" size={15} color="#0052FF" style={{ marginLeft: 4 }} />
        </Pressable>
      </View>

      {/* 4-column Grid */}
      <View style={styles.gridContainer}>
        {EXPLORE_SERVICES_12.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.card,
              { width: CARD_WIDTH },
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleItemPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title.replace('\n', ' ')}, rating ${item.rating}`}
          >
            {/* 1. Rating Badge */}
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={10} color="#F59E0B" style={{ marginRight: 2 }} />
              <Text style={styles.ratingText} numberOfLines={1}>
                {item.rating}
              </Text>
            </View>

            {/* 2. Image Area + Blue '+' Overlay */}
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: item.image }}
                style={styles.cardImage}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.plusCircle}>
                <Ionicons name="add" size={13} color="#0052FF" />
              </View>
            </View>

            {/* 3. Price row (if available, e.g. Cooking ₹49 ₹99) */}
            {item.price && (
              <View style={styles.priceRow}>
                <Text style={styles.priceCurrent}>{item.price}</Text>
                {item.originalPrice && (
                  <Text style={styles.priceOriginal}>{item.originalPrice}</Text>
                )}
              </View>
            )}

            {/* 4. Title (2-line centered label) */}
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
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
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
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
    fontWeight: '700',
    color: '#0052FF',
  },
  pressedText: {
    opacity: 0.6,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: COLUMN_GAP,
    rowGap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
    paddingBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1.5,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 5,
    paddingHorizontal: 1,
  },
  ratingText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#334155',
  },
  imageWrapper: {
    width: '100%',
    height: 52,
    position: 'relative',
    borderRadius: 8,
    overflow: 'visible',
    marginBottom: 4,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  plusCircle: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0052FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0052FF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 1,
  },
  priceCurrent: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  priceOriginal: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  cardTitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 13.5,
    marginTop: 2,
  },
});
