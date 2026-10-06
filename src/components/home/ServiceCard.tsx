import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Service } from '../../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { Rating } from '../common/Rating';
import { Badge } from '../common/Badge';

interface ServiceCardProps {
  service: Service;
  onPress: () => void;
  onBookPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  layout?: 'horizontal' | 'compact';
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onPress,
  onBookPress,
  onFavoritePress,
  isFavorite = false,
  layout = 'horizontal',
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, SHADOWS.card]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: service.imageUrl }} style={styles.image} />
        {service.discountBadge ? (
          <View style={styles.badgeWrapper}>
            <Badge label={service.discountBadge} variant="discount" />
          </View>
        ) : null}
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {service.name}
          </Text>
          {onFavoritePress && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onFavoritePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? COLORS.error : COLORS.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        {service.tagline ? (
          <Text style={styles.tagline} numberOfLines={1}>
            {service.tagline}
          </Text>
        ) : (
          <Text style={styles.tagline} numberOfLines={1}>
            From ₹{service.startingPrice} · {service.duration}
          </Text>
        )}

        <View style={styles.bottomRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>₹{service.startingPrice}</Text>
            <View style={styles.ratingBox}>
              <Rating rating={service.rating} reviewsCount={service.reviewsCount} size={12} />
            </View>
          </View>

          {onBookPress ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onBookPress}
              style={styles.bookNowBtn}
            >
              <Text style={styles.bookNowText}>Book Now</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.chevronBox}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.primaryDark} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: SPACING.base,
  },
  imageContainer: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.backgroundCardMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeWrapper: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
    flex: 1,
    marginRight: 6,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'column',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  ratingBox: {
    marginTop: 2,
  },
  bookNowBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(50, 100, 80, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  bookNowText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  chevronBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
