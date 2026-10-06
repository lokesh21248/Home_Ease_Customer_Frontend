import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

interface PriceBreakdownProps {
  subtotal: number;
  platformFee: number;
  taxes: number;
  discount?: number;
  total: number;
  currencySymbol?: string;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  subtotal,
  platformFee,
  taxes,
  discount = 0,
  total,
  currencySymbol = '₹',
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>Price Details</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Service Cost</Text>
        <Text style={styles.value}>
          {currencySymbol}{subtotal.toLocaleString('en-IN')}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Platform Fee</Text>
        <Text style={styles.value}>
          {currencySymbol}{platformFee.toLocaleString('en-IN')}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Taxes & GST (18%)</Text>
        <Text style={styles.value}>
          {currencySymbol}{taxes.toLocaleString('en-IN')}
        </Text>
      </View>

      {discount > 0 && (
        <View style={styles.row}>
          <Text style={[styles.label, styles.discountLabel]}>Coupon Discount</Text>
          <Text style={[styles.value, styles.discountValue]}>
            -{currencySymbol}{discount.toLocaleString('en-IN')}
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Payable</Text>
        <Text style={styles.totalValue}>
          {currencySymbol}{total.toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginVertical: SPACING.sm,
  },
  header: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  discountLabel: {
    color: COLORS.success,
    fontWeight: '600',
  },
  discountValue: {
    color: COLORS.success,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(50, 100, 80, 0.12)',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
});
