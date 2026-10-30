import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { CategoryCard } from './CategoryCard';
import { CATEGORIES_DATA, CategoryItem } from './types';
import { LayoutConstants } from '../../constants/layout';

interface CategoryGridProps {
  categories?: CategoryItem[];
  onSelectCategory: (id: string, name: string) => void;
}

export function CategoryGrid({
  categories = CATEGORIES_DATA,
  onSelectCategory,
}: CategoryGridProps) {
  const { width: screenWidth } = useWindowDimensions();

  const horizontalPadding = LayoutConstants.HORIZONTAL_PADDING;
  const gap = 10;
  const numColumns = 4;
  const cardWidth = Math.floor(
    (screenWidth - horizontalPadding * 2 - gap * (numColumns - 1)) / numColumns
  );

  if (!categories || categories.length === 0) {
    return null;
  }

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
});
