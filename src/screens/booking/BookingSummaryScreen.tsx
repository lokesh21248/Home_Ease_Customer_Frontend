import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useBooking } from '../../context/BookingContext';
import { bookingApi } from '../../api/bookingApi';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { PriceBreakdown } from '../../components/booking/PriceBreakdown';
import { Button } from '../../components/common/Button';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type BookingSummaryNavProp = StackNavigationProp<RootStackParamList, 'BookingSummary'>;

interface Props {
  navigation: BookingSummaryNavProp;
}

export const BookingSummaryScreen: React.FC<Props> = ({ navigation }) => {
  const {
    selectedService,
    selectedPackage,
    selectedSubServices,
    selectedAddons,
    selectedAddress,
    selectedDate,
    selectedTimeSlot,
    pricing,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useBooking();

  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    const clean = couponCode.trim().toUpperCase();
    if (!clean) return;

    try {
      setIsApplyingCoupon(true);
      const res = await bookingApi.validateCoupon(clean, pricing.subtotal);
      if (res && res.isValid) {
        const discountAmount = res.discountType === 'FIXED'
          ? (res.discountVal || 0)
          : (res.calculatedDiscount || Math.round((pricing.subtotal * (res.discountVal || 20)) / 100));

        applyCoupon({
          id: clean,
          code: clean,
          discountAmount,
          discountPercent: res.discountType === 'PERCENTAGE' ? res.discountVal : undefined,
          minOrderValue: 0,
          description: res.message || 'Coupon applied successfully',
          validUntil: '31 Dec 2026',
          calculatedDiscount: res.calculatedDiscount,
          discountType: res.discountType,
          discountVal: res.discountVal,
          message: res.message,
          isValid: true,
        });

        Alert.alert('Coupon Applied!', res.message || `You saved ₹${discountAmount} with ${clean}.`);
        setCouponCode('');
      } else {
        Alert.alert('Invalid Coupon', res?.message || 'The coupon code you entered is invalid or expired.');
      }
    } catch (e: any) {
      Alert.alert('Coupon Error', e?.message || 'Failed to validate coupon.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Booking Summary" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Service Item Card */}
        {selectedService && (
          <View style={[styles.serviceCard, SHADOWS.card]}>
            <Image source={{ uri: selectedService.imageUrl }} style={styles.serviceImage} />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{selectedService.name}</Text>
              {selectedSubServices && selectedSubServices.length > 0 ? (
                <Text style={styles.packageName}>
                  {selectedSubServices.map((s) => s.name).join(', ')}
                </Text>
              ) : selectedPackage ? (
                <Text style={styles.packageName}>{selectedPackage.name}</Text>
              ) : null}
              {selectedAddons && selectedAddons.length > 0 && (
                <Text style={styles.addonsMetaText}>
                  + {selectedAddons.map((a) => a.name).join(', ')}
                </Text>
              )}
              <Text style={styles.serviceMeta}>
                ₹{pricing.subtotal} · {selectedPackage?.duration || selectedService.duration}
              </Text>
            </View>
          </View>
        )}

        {/* Address Card */}
        <View style={[styles.infoCard, SHADOWS.subtle]}>
          <View style={styles.infoHeader}>
            <View style={styles.infoTitleRow}>
              <Ionicons name="location-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.infoTitle}>Service Address</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('AddressSelection')}>
              <Text style={styles.changeLink}>Change</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoPrimaryText}>
            {selectedAddress?.label || selectedAddress?.type || 'Home'}
          </Text>
          <Text style={styles.infoSubText}>
            {selectedAddress?.houseFlat}, {selectedAddress?.street}, {selectedAddress?.area}, {selectedAddress?.city}
          </Text>
        </View>

        {/* Date & Time Card */}
        <View style={[styles.infoCard, SHADOWS.subtle]}>
          <View style={styles.infoHeader}>
            <View style={styles.infoTitleRow}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.infoTitle}>Date & Time</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('DateTimeSlot')}>
              <Text style={styles.changeLink}>Change</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoPrimaryText}>{selectedDate}</Text>
          <Text style={styles.infoSubText}>{selectedTimeSlot}</Text>
        </View>

        {/* Coupon Code Section */}
        <View style={[styles.couponCard, SHADOWS.subtle]}>
          <View style={styles.couponHeader}>
            <Ionicons name="pricetag-outline" size={18} color={COLORS.primaryDark} />
            <Text style={styles.couponTitle}>Offers & Coupons</Text>
          </View>
          {appliedCoupon ? (
            <View style={styles.appliedRow}>
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedCode}>{appliedCoupon.code}</Text>
                <Text style={styles.appliedDesc}>Applied successfully</Text>
              </View>
              <TouchableOpacity onPress={removeCoupon} style={styles.removeCouponBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponInputRow}>
              <TextInput
                value={couponCode}
                onChangeText={setCouponCode}
                placeholder="Enter coupon code (e.g. WELCOME50)"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                style={styles.couponInput}
              />
              <TouchableOpacity
                disabled={!couponCode.trim() || isApplyingCoupon}
                onPress={handleApplyCoupon}
                style={[
                  styles.applyBtn,
                  (!couponCode.trim() || isApplyingCoupon) && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.applyBtnText}>
                  {isApplyingCoupon ? 'Verifying...' : 'Apply'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Itemized Price Breakdown matching Image 1 Screen 11 */}
        <PriceBreakdown
          subtotal={pricing.subtotal}
          platformFee={pricing.platformFee}
          taxes={pricing.taxes}
          discount={pricing.discount}
          total={pricing.total}
        />
      </ScrollView>

      {/* Sticky Proceed to Payment CTA */}
      <View style={[styles.bottomBar, SHADOWS.card]}>
        <View style={styles.totalBottomCol}>
          <Text style={styles.totalBottomLabel}>Total Amount</Text>
          <Text style={styles.totalBottomValue}>₹{pricing.total}</Text>
        </View>
        <Button
          title="Proceed to Payment"
          onPress={() => navigation.navigate('Payment')}
          variant="primary"
          size="lg"
          style={styles.proceedBtn}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xs,
    paddingBottom: 110,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  serviceImage: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.lg,
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 14,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  packageName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  addonsMetaText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    marginTop: 2,
    fontWeight: '500',
  },
  serviceMeta: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  changeLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  infoPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  infoSubText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  couponCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  couponTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(50, 100, 80, 0.15)',
    paddingHorizontal: 12,
    height: 48,
  },
  couponInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  appliedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    padding: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  appliedBadge: {
    flexDirection: 'column',
  },
  appliedCode: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  appliedDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  removeCouponBtn: {
    padding: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.95)',
  },
  totalBottomCol: {
    flexDirection: 'column',
  },
  totalBottomLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  totalBottomValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  proceedBtn: {
    minWidth: 180,
  },
});
