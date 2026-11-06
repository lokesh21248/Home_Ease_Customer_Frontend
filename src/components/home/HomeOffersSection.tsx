import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface OfferItem {
  id: string;
  code: string;
  title: string;
  description: string;
  tag: string;
  badgeBg: string;
}

const OFFERS_DATA: OfferItem[] = [
  {
    id: 'offer-1',
    code: 'FIRST100',
    title: 'Flat ₹100 Off',
    description: 'On your first home cleaning or repair service',
    tag: 'NEW USER',
    badgeBg: '#EFF6FF',
  },
  {
    id: 'offer-2',
    code: 'WALLET5',
    title: '5% Cashback',
    description: 'Pay using HomeEase Wallet on any booking',
    tag: 'WALLET',
    badgeBg: '#ECFDF5',
  },
  {
    id: 'offer-3',
    code: 'PASS99',
    title: '3 Visits FREE',
    description: 'Get HomeEase Pass for just ₹99/month',
    tag: 'POPULAR',
    badgeBg: '#FEF3C7',
  },
];

export function HomeOffersSection() {
  const handleOfferPress = () => {
    router.push('/(tabs)/categories');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="pricetag" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Exclusive Offers & Passes</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {OFFERS_DATA.map((offer) => (
          <Pressable
            key={offer.id}
            style={({ pressed }) => [styles.offerCard, pressed && styles.cardPressed]}
            onPress={handleOfferPress}
            accessibilityRole="button"
            accessibilityLabel={`${offer.title}: use code ${offer.code}`}
          >
            <View style={styles.topRow}>
              <View style={[styles.tagPill, { backgroundColor: offer.badgeBg }]}>
                <Text style={styles.tagText}>{offer.tag}</Text>
              </View>
              <View style={styles.codePill}>
                <Text style={styles.codeText}>{offer.code}</Text>
              </View>
            </View>

            <Text style={styles.offerTitle}>{offer.title}</Text>
            <Text style={styles.offerDesc}>{offer.description}</Text>

            <View style={styles.bottomLinkRow}>
              <Text style={styles.tapToApply}>Tap to explore</Text>
              <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
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
