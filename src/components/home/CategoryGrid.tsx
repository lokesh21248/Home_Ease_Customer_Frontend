import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { CategoryCard } from './CategoryCard';
import { CategoryItem } from './types';
import { LayoutConstants } from '../../constants/layout';
import { Colors, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface CategoryGridProps {
  categories?: CategoryItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onSelectCategory: (id: string, name: string) => void;
}

export function CategoryGrid({
  categories = [],
  isLoading = false,
  isError = false,
  onRetry,
  onSelectCategory,
}: CategoryGridProps) {
  const { width: screenWidth } = useWindowDimensions();

  const horizontalPadding = LayoutConstants.HORIZONTAL_PADDING;
  const gap = 10;
  // Responsive columns: 2 on tiny screens (< 340), 5 on tablets (> 600), 4 on standard phones
  const numColumns = screenWidth < 340 ? 2 : screenWidth > 600 ? 5 : 4;
  const cardWidth = Math.floor(
    (screenWidth - horizontalPadding * 2 - gap * (numColumns - 1)) / numColumns
  );

  // 1. Loading State: Skeleton Placeholders
  if (isLoading && categories.length === 0) {
    const skeletonHeight = Math.round(cardWidth * 0.74) + 42;
    return (
      <View style={styles.gridContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={`cat-skeleton-${i}`}
            style={[
              styles.skeletonCard,
              { width: cardWidth, height: skeletonHeight },
            ]}
          >
            <View style={styles.skeletonImage} />
            <View style={styles.skeletonText} />
          </View>
        ))}
      </View>
    );
  }

  // 2. Error State
  if (isError && categories.length === 0) {
    return (
      <View style={styles.messageBox}>
        <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
        <Text style={styles.errorText}>Unable to load service categories</Text>
        {onRetry && (
          <Pressable style={styles.retryBtn} onPress={onRetry}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // 3. Empty State
  if (!categories || categories.length === 0) {
    return (
      <View style={styles.messageBox}>
        <Ionicons name="apps-outline" size={28} color="#94A3B8" />
        <Text style={styles.emptyText}>No service categories currently available</Text>
      </View>
    );
  }

  // 4. Content Grid
  return (
    <View style={styles.gridContainer}>
      {categories.map((category, index) => (
        <View key={category.key || `${category.id}-${index}`} style={{ width: cardWidth }}>
          <CategoryCard
            id={category.id}
            name={category.name}
            image={category.image}
            width={cardWidth}
            onPress={onSelectCategory}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    padding: 6,
    alignItems: 'center',
  },
  skeletonImage: {
    width: '100%',
    height: '65%',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
  },
  skeletonText: {
    width: '75%',
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    marginTop: 10,
  },
  messageBox: {
    marginHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  errorText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
  },
});
