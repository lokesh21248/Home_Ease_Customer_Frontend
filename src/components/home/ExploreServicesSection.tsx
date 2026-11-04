import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Star, Sparkles } from 'lucide-react-native';
import { SectionHeader } from './SectionHeader';
import { HomeColors } from './types';
import { LayoutConstants } from '../../constants/layout';
import { ExploreServiceItem } from '../../api/client';

interface ExploreServicesSectionProps {
  services?: ExploreServiceItem[];
  isLoading?: boolean;
  onSeeAllPress?: () => void;
  onSelectService: (service: ExploreServiceItem) => void;
}

export function ExploreServicesSection({
  services = [],
  isLoading = false,
  onSeeAllPress,
  onSelectService,
}: ExploreServicesSectionProps) {
  const cardWidth = 140;
  const imageHeight = 105;

  if (!isLoading && (!services || services.length === 0)) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Explore Services"
        actionText="See All →"
        onActionPress={onSeeAllPress}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsRow}
      >
        {services.map((item, index) => {
          const hasDiscount = item.originalPrice && Number(item.originalPrice) > Number(item.price);
          const discountPercent = hasDiscount
            ? Math.round(((Number(item.originalPrice) - Number(item.price)) / Number(item.originalPrice)) * 100)
            : 0;

          return (
            <Pressable
              key={item.id || `explore-${index}`}
              style={({ pressed }) => [
                styles.card,
                { width: cardWidth },
                pressed && styles.pressed,
              ]}
              onPress={() => onSelectService(item)}
              accessibilityRole="button"
              accessibilityLabel={`Explore Service: ${item.name}`}
            >
              {/* Upper Image Container */}
              <View style={[styles.imageContainer, { height: imageHeight }]}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.image}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Sparkles size={24} color="#94A3B8" />
                  </View>
                )}

                {/* Price Pill */}
                {item.price > 0 && (
                  <View style={styles.pricePill}>
                    <Text style={styles.priceText}>₹{item.price}</Text>
                  </View>
                )}

                {/* Discount Badge */}
                {discountPercent > 0 && (
                  <View style={styles.discountPill}>
                    <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                  </View>
                )}

                {/* Spotlight / Featured Star Indicator */}
                {item.isFeatured && (
                  <View style={styles.featuredBadge}>
                    <Star size={10} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                )}
              </View>

              {/* Lower Details */}
              <View style={styles.detailsContainer}>
                {/* Rating & Review Count */}
                <View style={styles.ratingRow}>
                  <Star size={11} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {item.rating ? Number(item.rating).toFixed(1) : '4.8'}
                  </Text>
                  <Text style={styles.reviewCountText}>
                    ({item.reviewCount || 0})
                  </Text>
                </View>

                {/* Service Name */}
                <Text style={styles.nameText} numberOfLines={2}>
                  {item.name}
                </Text>

                {/* Category Tag */}
                {item.categoryName ? (
                  <Text style={styles.categoryText} numberOfLines={1}>
                    {item.categoryName}
                  </Text>
                ) : null}

                {/* Pricing & Original Strikethrough */}
                <View style={styles.priceRow}>
                  <Text style={styles.mainPriceText}>
                    ₹{Number(item.price).toLocaleString('en-IN')}
                  </Text>
                  {hasDiscount && (
                    <Text style={styles.originalPriceText}>
                      ₹{Number(item.originalPrice).toLocaleString('en-IN')}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  cardsRow: {
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  card: {
    backgroundColor: HomeColors.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: HomeColors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 5,
      },
    }),
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#EAEFF8',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  pricePill: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  discountPill: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  featuredBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    padding: 3,
  },
  detailsContainer: {
    padding: 8,
    flexDirection: 'column',
    gap: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E293B',
  },
  reviewCountText: {
    fontSize: 9,
    color: '#94A3B8',
  },
  nameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 16,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
    color: HomeColors.primaryBlue,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  mainPriceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  originalPriceText: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
});

