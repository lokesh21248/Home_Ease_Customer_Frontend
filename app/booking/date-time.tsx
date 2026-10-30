/**
 * Select Date & Time Screen — Pronto-style date pills, time slot grid, selected service card.
 * Route: /booking/date-time
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { bookingApi, TimeSlot } from '../../src/api/client';
import { useCart } from '../../src/context/CartContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

function getNext7Days(): { date: Date; label: string; dayName: string; monthName: string; dateStr: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    return {
      date: d,
      label: String(d.getDate()),
      dayName,
      monthName,
      dateStr,
    };
  });
}

export default function DateTimeScreen() {
  const insets = useSafeAreaInsets();
  const { cart, setSlot } = useCart();

  const days = getNext7Days();
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSlotsError('');
      try {
        const slots = await bookingApi.getTimeSlots(selectedDay.dateStr);
        if (mounted) {
          setTimeSlots(slots);
          const firstAvailable = slots.find((s) => s.available);
          setSelectedTime(firstAvailable ? firstAvailable.time : null);
        }
      } catch (err: any) {
        if (mounted) {
          setSlotsError(err?.message || 'Failed to load time slots');
          setTimeSlots([]);
          setSelectedTime(null);
        }
      } finally {
        if (mounted) setSlotsLoading(false);
      }
    };
    fetchSlots();
    return () => { mounted = false; };
  }, [selectedDay]);

  const firstItem = cart.items[0];
  const selectedItemName = firstItem?.subService.name || cart.category?.name || 'Selected Service';
  const selectedItemPrice = cart.subtotal > 0 ? cart.subtotal : firstItem?.subService.basePrice || 0;
  const durationText = firstItem?.subService.estimatedMins
    ? `${firstItem.subService.estimatedMins} Mins`
    : 'Standard';
  const imageUrl = firstItem?.subService.imageUrl || cart.category?.imageUrl;

  const handleContinue = () => {
    if (!selectedTime) {
      alert('Please select a time slot.');
      return;
    }
    const slotObj: TimeSlot = {
      time: selectedTime,
      available: true,
      date: selectedDay.dateStr,
    };
    setSlot(slotObj, selectedDay.dateStr);
    router.push('/booking/summary');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with White Status Bar Fill */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Select Date & Time</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 80 + Math.max(insets.bottom, 16) },
        ]}
      >
        {/* Date Selector Row */}
        <View style={styles.section}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysScroll}
          >
            {days.map((d) => {
              const isSelected = d.dateStr === selectedDay.dateStr;
              return (
                <Pressable
                  key={d.dateStr}
                  style={[styles.datePill, isSelected && styles.datePillSelected]}
                  onPress={() => setSelectedDay(d)}
                >
                  <Text style={[styles.dateDayName, isSelected && styles.dateDayNameSelected]}>
                    {d.dayName}
                  </Text>
                  <Text style={[styles.dateNumber, isSelected && styles.dateNumberSelected]}>
                    {d.monthName} {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Slot Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time Slot</Text>
          {slotsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : slotsError ? (
            <Text style={{ color: Colors.error, marginTop: 10 }}>{slotsError}</Text>
          ) : timeSlots.length === 0 ? (
            <Text style={{ color: Colors.textSecondary, marginTop: 10 }}>No slots available for this date.</Text>
          ) : (
            <View style={styles.slotsGrid}>
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot.time;
                const isAvailable = slot.available;
                return (
                  <Pressable
                    key={slot.time}
                    style={[
                      styles.slotCard,
                      isSelected && styles.slotCardSelected,
                      !isAvailable && { opacity: 0.5, backgroundColor: '#F3F4F6' },
                    ]}
                    onPress={() => {
                      if (isAvailable) setSelectedTime(slot.time);
                    }}
                    disabled={!isAvailable}
                  >
                    <Text
                      style={[
                        styles.slotTimeText,
                        isSelected && styles.slotTimeTextSelected,
                        !isAvailable && { color: Colors.textMuted },
                      ]}
                    >
                      {slot.time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Selected Service Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected Service</Text>
          <View style={styles.serviceCard}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.serviceThumb}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.serviceThumb, { backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 24 }}>🏠</Text>
              </View>
            )}
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {selectedItemName}
              </Text>
              <Text style={styles.serviceDuration}>⏱ {durationText}</Text>
            </View>
            <Text style={styles.servicePrice}>₹{selectedItemPrice}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Continue Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 26,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  headerRightPlaceholder: {
    width: 36,
  },

  scroll: {
    paddingVertical: Spacing.base,
  },
  section: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  // Date Pills
  daysScroll: {
    gap: 10,
    paddingRight: Spacing.base,
  },
  datePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ECEFF3',
    minWidth: 78,
    ...Shadows.xs,
  },
  datePillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateDayName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateDayNameSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  dateNumber: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  dateNumberSelected: {
    color: '#FFFFFF',
  },

  // Time Slots
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCard: {
    width: (width - Spacing.base * 2 - 10) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: '#ECEFF3',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },
  slotCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotTimeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  slotTimeTextSelected: {
    color: '#FFFFFF',
  },

  // Selected Service
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#ECEFF3',
    gap: 12,
    ...Shadows.sm,
  },
  serviceThumb: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E5E7EB',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  serviceDuration: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  servicePrice: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    ...Shadows.md,
  },
  continueBtn: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.blue,
  },
  continueBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: '#FFFFFF',
  },
});
