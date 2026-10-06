import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { MOCK_COUPONS } from '../../constants/mockData';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type OffersNavProp = StackNavigationProp<RootStackParamList, 'OffersCoupons'>;

interface Props {
  navigation: OffersNavProp;
}

export const OffersCouponsScreen: React.FC<Props> = ({ navigation }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    setCopiedCode(code);
    Alert.alert('Coupon Copied!', `Code "${code}" copied to clipboard. You can paste it during checkout.`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <ScreenWrapper>
      <Header title="Offers & Coupons" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerSubtitle}>
          Apply these coupon codes at checkout to get instant savings on professional home services.
        </Text>

        {MOCK_COUPONS.map((coupon) => (
          <View key={coupon.code} style={[styles.couponCard, SHADOWS.card]}>
            <View style={styles.topRow}>
              <View style={styles.tagIconCircle}>
                <Ionicons name="pricetag" size={18} color={COLORS.primaryDark} />
              </View>
              <View style={styles.titleCol}>
                <Text style={styles.couponTitle}>{coupon.title}</Text>
                <Text style={styles.minOrderText}>Min. booking value: ₹{coupon.minOrderValue}</Text>
              </View>
            </View>

            <Text style={styles.descriptionText}>{coupon.description}</Text>

            <View style={styles.footerRow}>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{coupon.code}</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleCopy(coupon.code)}
                style={styles.copyBtn}
              >
                <Text style={styles.copyBtnText}>
                  {copiedCode === coupon.code ? 'Copied ✓' : 'Copy Code'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.expiryText}>Expires on {coupon.expiresOn}</Text>
          </View>
        ))}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xs,
    paddingBottom: 40,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.base,
    lineHeight: 18,
  },
  couponCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagIconCircle: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleCol: {
    flex: 1,
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  minOrderText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(235, 245, 240, 0.8)',
    borderRadius: RADIUS.lg,
    padding: 6,
    paddingLeft: 14,
  },
  codeBox: {
    flex: 1,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 1,
  },
  copyBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  expiryText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
  },
});
