import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'discount' | 'price' | 'status' | 'outline' | 'yellow';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'discount',
  style,
  textStyle,
}) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'price':
        return styles.priceBadge;
      case 'status':
        return styles.statusBadge;
      case 'yellow':
        return styles.yellowBadge;
      case 'outline':
        return styles.outlineBadge;
      case 'discount':
      default:
        return styles.discountBadge;
    }
  };

  const getBadgeTextStyle = () => {
    switch (variant) {
      case 'price':
      case 'yellow':
        return styles.priceText;
      case 'status':
        return styles.statusText;
      case 'outline':
        return styles.outlineText;
      case 'discount':
      default:
        return styles.discountText;
    }
  };

  return (
    <View style={[styles.base, getBadgeStyle(), style]}>
      <Text style={[styles.baseText, getBadgeTextStyle(), textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  priceBadge: {
    backgroundColor: COLORS.accent, // Warm honey yellow from Image 2
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  yellowBadge: {
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  statusBadge: {
    backgroundColor: COLORS.successLight,
  },
  outlineBadge: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  baseText: {
    fontSize: 12,
    fontWeight: '700',
  },
  discountText: {
    color: COLORS.primaryDark,
  },
  priceText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  statusText: {
    color: COLORS.success,
  },
  outlineText: {
    color: COLORS.textSecondary,
  },
});
