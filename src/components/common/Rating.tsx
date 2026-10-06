import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

interface RatingProps {
  rating: number;
  reviewsCount?: number;
  size?: number;
  textColor?: string;
}

export const Rating: React.FC<RatingProps> = ({
  rating,
  reviewsCount,
  size = 14,
  textColor = COLORS.textSecondary,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name="star" size={size} color={COLORS.accent} style={styles.starIcon} />
      <Text style={[styles.ratingText, { fontSize: size, color: COLORS.textPrimary }]}>
        {rating.toFixed(1)}
      </Text>
      {reviewsCount !== undefined && (
        <Text style={[styles.reviewsText, { fontSize: size - 2, color: textColor }]}>
          ({reviewsCount > 999 ? `${(reviewsCount / 1000).toFixed(1)}K` : reviewsCount})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 4,
  },
  ratingText: {
    fontWeight: '700',
    marginRight: 4,
  },
  reviewsText: {
    fontWeight: '500',
  },
});
