import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Category } from '../../types';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
  isSelected?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
  isSelected = false,
}) => {
  const renderIcon = () => {
    const color = isSelected ? COLORS.primaryDark : COLORS.primaryDark;
    const size = 26;

    if (category.iconType === 'Ionicons') {
      return <Ionicons name={category.iconName as any} size={size} color={color} />;
    }
    return <MaterialCommunityIcons name={category.iconName as any} size={size} color={color} />;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.container,
        isSelected && styles.containerSelected,
      ]}
    >
      <View
        style={[
          styles.iconBox,
          isSelected ? styles.iconBoxSelected : styles.iconBoxNormal,
          SHADOWS.subtle,
        ]}
      >
        {renderIcon()}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 78,
    marginRight: 10,
    marginBottom: 12,
  },
  containerSelected: {
    transform: [{ scale: 1.03 }],
  },
  iconBox: {
    width: 62,
    height: 62,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  iconBoxNormal: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  iconBoxSelected: {
    backgroundColor: COLORS.accent, // Warm honey yellow from Image 2
    borderColor: COLORS.accentHover,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 6,
    textAlign: 'center',
  },
});
