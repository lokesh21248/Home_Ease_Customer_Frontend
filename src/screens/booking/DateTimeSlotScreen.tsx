import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useBooking } from '../../context/BookingContext';
import { bookingApi } from '../../api/bookingApi';
import { TimeSlot } from '../../types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { TimeSlotSelector } from '../../components/booking/TimeSlotSelector';
import { Button } from '../../components/common/Button';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';

type DateTimeSlotNavProp = StackNavigationProp<RootStackParamList, 'DateTimeSlot'>;

interface Props {
  navigation: DateTimeSlotNavProp;
}

function getUpcomingDates(count = 14) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const result = [];
  const start = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dayName = days[d.getDay()];
    const dayNumber = String(d.getDate()).padStart(2, '0');
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    const fullDate = `${dayNumber} ${monthName} ${year}`;
    result.push({
      dayName,
      dayNumber,
      fullDate,
    });
  }
  return result;
}

const UPCOMING_DATES = getUpcomingDates();

export const DateTimeSlotScreen: React.FC<Props> = ({ navigation }) => {
  const { selectedDate, selectedTimeSlot, setDateTime } = useBooking();

  const [date, setDate] = useState<string>(selectedDate || UPCOMING_DATES[0]?.fullDate || '05 Oct 2026');
  const [slot, setSlot] = useState<string>(selectedTimeSlot || '');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const loadSlots = async (selected: string) => {
    setLoading(true);
    try {
      const data = await bookingApi.getTimeSlots(selected);
      setSlots(data);
      // Auto-select first available slot if current slot not selected
      if (!slot) {
        const firstAvail = data.find((s) => s.isAvailable || s.available);
        if (firstAvail) {
          setSlot(firstAvail.time);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots(date);
  }, [date]);

  const handleContinue = () => {
    setDateTime(date, slot);
    navigation.navigate('BookingSummary');
  };

  return (
    <ScreenWrapper>
      <Header title="Choose Date & Time" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryDark} />
          </View>
        ) : (
          <TimeSlotSelector
            dates={UPCOMING_DATES}
            selectedDate={date}
            onSelectDate={(newDate) => setDate(newDate)}
            slots={slots}
            selectedSlot={slot}
            onSelectSlot={(newSlot) => setSlot(newSlot)}
            currentMonth={currentMonth}
          />
        )}
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={[styles.bottomBar, SHADOWS.card]}>
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!slot || !date}
          variant="primary"
          size="lg"
          style={{ width: '100%' }}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 110,
  },
  loaderContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.95)',
  },
});
