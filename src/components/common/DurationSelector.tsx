import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export interface DurationPlan {
  minutes: number;
  label: string;
  price: number;
  originalPrice?: number;
  popular?: boolean;
}

export const DEFAULT_DURATION_PLANS: DurationPlan[] = [
  { minutes: 30, label: '30 mins', price: 199, originalPrice: 299 },
  { minutes: 60, label: '60 mins (1 hr)', price: 349, originalPrice: 499, popular: true },
  { minutes: 90, label: '90 mins (1.5 hrs)', price: 499, originalPrice: 699 },
  { minutes: 120, label: '120 mins (2 hrs)', price: 629, originalPrice: 899 },
];

interface DurationSelectorProps {
  plans?: DurationPlan[];
  selectedMinutes: number;
  onSelect: (plan: DurationPlan) => void;
}

export function DurationSelector({
  plans = DEFAULT_DURATION_PLANS,
  selectedMinutes,
  onSelect,
}: DurationSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Select Service Duration</Text>
      <Text style={styles.sectionSubtitle}>
        Choose duration according to your service requirement
      </Text>

      <View style={styles.plansGrid}>
        {plans.map((plan) => {
          const isSelected = selectedMinutes === plan.minutes;

          return (
            <Pressable
              key={plan.minutes}
              style={({ pressed }) => [
                styles.planCard,
                isSelected && styles.planCardSelected,
                pressed && styles.planCardPressed,
              ]}
              onPress={() => onSelect(plan)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${plan.label} for ₹${plan.price}`}
            >
              {plan.popular ? (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              ) : null}

              <View style={styles.cardHeaderRow}>
                <View style={styles.durationRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={isSelected ? Colors.primary : Colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.durationLabel, isSelected && styles.durationLabelSelected]}>
                    {plan.label}
                  </Text>
                </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={[styles.priceText, isSelected && styles.priceTextSelected]}>
                  ₹{plan.price}
                </Text>
                {plan.originalPrice ? (
                  <Text style={styles.originalPriceText}>₹{plan.originalPrice}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  plansGrid: {
    gap: Spacing.sm,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    position: 'relative',
    ...Shadows.sm,
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFade2,
  },
  planCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    color: Colors.textOnPrimary,
    letterSpacing: 0.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  durationLabelSelected: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceText: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  priceTextSelected: {
    color: Colors.primary,
  },
  originalPriceText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
});

