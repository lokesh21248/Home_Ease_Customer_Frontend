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

// 4-column calculation to fit perfectly on any mobile screen
const HORIZONTAL_PADDING = 14;
const COLUMN_GAP = 8;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP * 3) / 4);
const CARD_HEIGHT = Math.round(CARD_WIDTH * (115 / 130));

export interface ExploreGridItem {
  id: string;
  title: string;
  rating: string;
  cardImage: any;
  price?: string;
  originalPrice?: string;
  categoryMatch?: string;
}

const CARD_IMAGES: Record<string, any> = {
  'daily-home-cleaning': require('../../../assets/images/services/daily_cleaning_card.png'),
  'homeease-verified': require('../../../assets/images/services/verified_worker_card.png'),
  'cooking': require('../../../assets/images/services/cooking_card.png'),
  'sofa-carpet-cleaning': require('../../../assets/images/services/sofa_carpet_card.png'),
  'ac-service-repair': require('../../../assets/images/services/ac_repair_card.png'),
  'appliance-repair': require('../../../assets/images/services/appliance_repair_card.png'),
  'bathroom-cleaning': require('../../../assets/images/services/bathroom_cleaning_card.png'),
  'pest-control': require('../../../assets/images/services/pest_control_card.png'),
  'painting-home-office': require('../../../assets/images/services/painting_card.png'),
  'electrician-service': require('../../../assets/images/services/electrician_card.png'),
  'plumbing-service': require('../../../assets/images/services/plumbing_card.png'),
  'carpentry-service': require('../../../assets/images/services/carpentry_card.png'),
};

export const EXPLORE_SERVICES_12: ExploreGridItem[] = [
  {
    id: 'daily-home-cleaning',
    title: 'Daily Home\nCleaning',
    rating: '4.9 (48.3K)',
    cardImage: CARD_IMAGES['daily-home-cleaning'],
    categoryMatch: 'Cleaning',
  },
  {
    id: 'homeease-verified',
    title: 'HomeEase\nVerified',
    rating: '4.9 (79.0K)',
    cardImage: CARD_IMAGES['homeease-verified'],
    categoryMatch: 'Cleaning',
  },
  {
    id: 'cooking',
    title: 'Cooking',
    rating: '4.9 (79.0K)',
    price: '₹49',
    originalPrice: '₹99',
    cardImage: CARD_IMAGES['cooking'],
    categoryMatch: 'Cooking',
  },
  {
    id: 'sofa-carpet-cleaning',
    title: 'Sofa & Carpet\nCleaning',
    rating: '4.8 (32.1K)',
    cardImage: CARD_IMAGES['sofa-carpet-cleaning'],
    categoryMatch: 'Cleaning',
  },
  {
    id: 'ac-service-repair',
    title: 'AC Service\n& Repair',
    rating: '4.9 (52.4K)',
    cardImage: CARD_IMAGES['ac-service-repair'],
    categoryMatch: 'AC Service & Repair',
  },
  {
    id: 'appliance-repair',
    title: 'Appliance\nRepair',
    rating: '4.8 (40.0K)',
    cardImage: CARD_IMAGES['appliance-repair'],
    categoryMatch: 'Appliance Repair',
  },
  {
    id: 'bathroom-cleaning',
    title: 'Bathroom\nCleaning',
    rating: '4.9 (28.6K)',
    cardImage: CARD_IMAGES['bathroom-cleaning'],
    categoryMatch: 'Cleaning',
  },
  {
    id: 'pest-control',
    title: 'Pest\nControl',
    rating: '4.9 (17.9K)',
    cardImage: CARD_IMAGES['pest-control'],
    categoryMatch: 'Pest Control',
  },
  {
    id: 'painting-home-office',
    title: 'Painting\n(Home/Office)',
    rating: '4.9 (21.7K)',
    cardImage: CARD_IMAGES['painting-home-office'],
    categoryMatch: 'Painting',
  },
  {
    id: 'electrician-service',
    title: 'Electrician\nService',
    rating: '4.8 (15.6K)',
    cardImage: CARD_IMAGES['electrician-service'],
    categoryMatch: 'Electrician Services',
  },
  {
    id: 'plumbing-service',
    title: 'Plumbing\nService',
    rating: '4.9 (12.3K)',
    cardImage: CARD_IMAGES['plumbing-service'],
    categoryMatch: 'Plumbing',
  },
  {
    id: 'carpentry-service',
    title: 'Carpentry\nService',
    rating: '4.8 (11.9K)',
    cardImage: CARD_IMAGES['carpentry-service'],
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
              styles.cardPressable,
              { width: CARD_WIDTH, height: CARD_HEIGHT },
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleItemPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title.replace('\n', ' ')}, rating ${item.rating}`}
          >
            <Image
              source={item.cardImage}
              style={styles.cardImage}
              contentFit="contain"
              transition={150}
            />
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
    rowGap: 10,
  },
  cardPressable: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
});
