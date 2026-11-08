import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useCoupons } from '../../hooks/useCoupons';
import { Coupon } from '../../api/client';

export function HomeOffersSection() {
  const { data: coupons = [], isLoading, isError } = useCoupons();

  if (!isLoading && (isError || coupons.length === 0)) {
    return null;
  }

  const activeCoupons = coupons.filter((c) => c.isActive !== false);

  if (!isLoading && activeCoupons.length === 0) {
    return null;
  }

  const handleOfferPress = (_coupon: Coupon) => {
    router.push('/(tabs)/categories');
  };

  const badgeColors = ['#EFF6FF', '#ECFDF5', '#FEF3C7', '#F3E8FF'];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="pricetag" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Exclusive Offers & Passes</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking active offers...</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {activeCoupons.map((coupon, index) => {
            const isPercent = coupon.discountType === 'PERCENTAGE';
            const title = isPercent
              ? `${coupon.discountVal}% Off`
              : `Flat ₹${Math.round(coupon.discountVal)} Off`;

            const description = coupon.minOrderValue
              ? `On orders above ₹${Math.round(coupon.minOrderValue)}`
              : coupon.maxDiscountAmount
              ? `Max discount up to ₹${Math.round(coupon.maxDiscountAmount)}`
              : 'Valid on your home service booking';

            const tag = isPercent ? `${Math.round(coupon.discountVal)}% OFF` : 'PROMO';
            const badgeBg = badgeColors[index % badgeColors.length];

            return (
              <Pressable
                key={coupon.couponId || `coupon-${index}`}
                style={({ pressed }) => [styles.offerCard, pressed && styles.cardPressed]}
                onPress={() => handleOfferPress(coupon)}
                accessibilityRole="button"
                accessibilityLabel={`${title}: use code ${coupon.code}`}
              >
                <View style={styles.topRow}>
                  <View style={[styles.tagPill, { backgroundColor: badgeBg }]}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                  <View style={styles.codePill}>
                    <Text style={styles.codeText}>{coupon.code}</Text>
                  </View>
                </View>

                <Text style={styles.offerTitle}>{title}</Text>
                <Text style={styles.offerDesc}>{description}</Text>

                <View style={styles.bottomLinkRow}>
                  <Text style={styles.tapToApply}>Tap to explore</Text>
                  <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 20,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  offerCard: {
    width: 220,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.primary,
  },
  codePill: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  offerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  offerDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  bottomLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapToApply: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: Colors.primary,
  },
});
