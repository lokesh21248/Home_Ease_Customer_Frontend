import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export interface ServiceCardData {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  estimatedMins?: number;
}

interface ServiceCardProps {
  service: ServiceCardData;
  onPress: (service: ServiceCardData) => void;
  onAdd?: (service: ServiceCardData) => void;
  isSelected?: boolean;
}

export function ServiceCard({
  service,
  onPress,
  onAdd,
  isSelected = false,
}: ServiceCardProps) {
  const durationText = service.estimatedMins
    ? `${service.estimatedMins} mins`
    : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(service)}
      accessibilityRole="button"
      accessibilityLabel={`${service.name}, starting from ₹${service.price}`}
    >
      <View style={styles.contentRow}>
        <View style={styles.infoCol}>
          <Text style={styles.title} numberOfLines={2}>
            {service.name}
          </Text>

          {service.rating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 3 }} />
              <Text style={styles.ratingText}>
                {service.rating.toFixed(1)}
                {service.reviewCount ? ` (${service.reviewCount})` : ''}
              </Text>
            </View>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>₹{service.price}</Text>
            {service.originalPrice && service.originalPrice > service.price ? (
              <Text style={styles.originalPriceText}>₹{service.originalPrice}</Text>
            ) : null}
            {durationText ? (
              <Text style={styles.durationTag}>• {durationText}</Text>
            ) : null}
          </View>

          {service.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {service.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.imageCol}>
          {service.imageUrl ? (
            <Image
              source={{ uri: service.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="sparkles" size={24} color={Colors.primary} />
            </View>
          )}

          {onAdd ? (
            <Pressable
              style={({ pressed }) => [
                styles.addBtn,
                isSelected && styles.addBtnSelected,
                pressed && styles.addBtnPressed,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onAdd(service);
              }}
              accessibilityRole="button"
              accessibilityLabel={isSelected ? 'Remove' : 'Add'}
            >
              <Text style={[styles.addBtnText, isSelected && styles.addBtnTextSelected]}>
                {isSelected ? 'ADDED ✓' : '+ ADD'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginVertical: Spacing.xs,
    ...Shadows.sm,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFade2,
  },
  cardPressed: {
    opacity: 0.92,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    paddingRight: Spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  priceText: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  originalPriceText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  durationTag: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  description: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  imageCol: {
    width: 90,
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: 90,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  imagePlaceholder: {
    width: 90,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  addBtnSelected: {
    backgroundColor: Colors.primary,
  },
  addBtnPressed: {
    opacity: 0.85,
  },
  addBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: Colors.primary,
  },
  addBtnTextSelected: {
    color: Colors.textOnPrimary,
  },
});
