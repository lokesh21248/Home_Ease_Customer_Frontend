import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimeSlot } from '../../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';

interface DateItem {
  dayName: string;
  dayNumber: string;
  fullDate: string;
}

interface TimeSlotSelectorProps {
  dates: DateItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  slots: TimeSlot[];
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
  currentMonth?: string;
}

export const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  dates,
  selectedDate,
  onSelectDate,
  slots,
  selectedSlot,
  onSelectSlot,
  currentMonth = 'September 2026',
}) => {
  const morningSlots = slots.filter((s) => s.period === 'Morning');
  const afternoonSlots = slots.filter((s) => s.period === 'Afternoon');
  const eveningSlots = slots.filter((s) => s.period === 'Evening');
  const otherSlots = slots.filter(
    (s) => !s.period || !['Morning', 'Afternoon', 'Evening'].includes(s.period)
  );

  const renderSlotGroup = (title: string, groupSlots: TimeSlot[]) => {
    if (groupSlots.length === 0) return null;
    return (
      <View style={styles.groupContainer}>
        <Text style={styles.groupTitle}>{title}</Text>
        <View style={styles.slotsGrid}>
          {groupSlots.map((slot) => {
            const isSelected = selectedSlot === slot.time;
            const isSlotAvailable = slot.isAvailable ?? slot.available ?? true;
            return (
              <TouchableOpacity
                key={slot.id}
                disabled={!isSlotAvailable}
                activeOpacity={0.7}
                onPress={() => onSelectSlot(slot.time)}
                style={[
                  styles.slotCard,
                  isSelected && styles.slotCardSelected,
                  !isSlotAvailable && styles.slotCardDisabled,
                  SHADOWS.subtle,
                ]}
              >
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.slotTimeText,
                    isSelected && styles.slotTimeTextSelected,
                    !isSlotAvailable && styles.slotTimeTextDisabled,
                  ]}
                >
                  {slot.time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.monthRow}>
        <Text style={styles.monthText}>{currentMonth}</Text>
        <View style={styles.monthArrows}>
          <TouchableOpacity style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={18} color={COLORS.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primaryDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
      >
        {dates.map((d) => {
          const isSelected = selectedDate === d.fullDate;
          return (
            <TouchableOpacity
              key={d.fullDate}
              activeOpacity={0.8}
              onPress={() => onSelectDate(d.fullDate)}
              style={[
                styles.dateCard,
                isSelected && styles.dateCardSelected,
                SHADOWS.subtle,
              ]}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                {d.dayName}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                {d.dayNumber}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Available Slots Title */}
      <Text style={styles.sectionTitle}>Available Slots</Text>

      {/* Slot Groups */}
      {renderSlotGroup('Morning', morningSlots)}
      {renderSlotGroup('Afternoon', afternoonSlots)}
      {renderSlotGroup('Evening', eveningSlots)}
      {renderSlotGroup('Other Slots', otherSlots)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.base,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  monthArrows: {
    flexDirection: 'row',
    gap: 8,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  dateStrip: {
    paddingHorizontal: SPACING.base,
    gap: 10,
    marginBottom: SPACING.lg,
  },
  dateCard: {
    width: 58,
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCardSelected: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dayNameSelected: {
    color: COLORS.accent, // Warm honey yellow on dark card
  },
  dayNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.sm,
  },
  groupContainer: {
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.base,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  slotsGrid: {
    gap: 8,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  slotCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: COLORS.primaryDark,
  },
  slotCardDisabled: {
    opacity: 0.45,
    backgroundColor: 'rgba(220, 230, 225, 0.4)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: 'rgba(50, 100, 80, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: COLORS.primaryDark,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryDark,
  },
  slotTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  slotTimeTextSelected: {
    fontWeight: '700',
  },
  slotTimeTextDisabled: {
    color: COLORS.textMuted,
  },
});
