/**
 * Select Date & Time Screen — Urban Company style Dual Booking System:
 * 1. ⚡ Instant Booking: Immediate dispatch, nearby partner discovery, live ETA
 * 2. 📅 Scheduled Booking: Interactive calendar, dynamic slot calculation from actual worker availability
 * Route: /booking/date-time
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  bookingApi,
  TimeSlot,
  AvailableDate,
  AvailableSlot,
  NearbyWorker,
} from '../../src/api/client';
import { useCart } from '../../src/context/CartContext';
import { useUserLocation } from '../../src/hooks/useUserLocation';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { Zap, Calendar, MapPin, Clock, Star, Users, CheckCircle, AlertCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function DateTimeScreen() {
  const insets = useSafeAreaInsets();
  const { cart, setSlot, setBookingType, setActiveHold } = useCart();
  const userLoc = useUserLocation();

  // Mode state: 'INSTANT' or 'SCHEDULED'
  const [mode, setMode] = useState<'INSTANT' | 'SCHEDULED'>(cart.bookingType || 'INSTANT');

  // --- Instant Booking State ---
  const [nearbyWorkers, setNearbyWorkers] = useState<NearbyWorker[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [instantEtaMinutes, setInstantEtaMinutes] = useState<number>(18);

  // --- Scheduled Booking State ---
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState<number>(0);
  const [isHoldingSlot, setIsHoldingSlot] = useState<boolean>(false);

  const firstItem = cart.items[0];
  const serviceId = cart.category?.serviceId;
  const subServiceId = firstItem?.subService.subServiceId;
  const selectedItemName = firstItem?.subService.name || cart.category?.name || 'Selected Service';
  const selectedItemPrice = cart.total > 0 ? cart.total : firstItem?.subService.basePrice || 0;
  const durationText = firstItem?.subService.estimatedMins
    ? `${firstItem.subService.estimatedMins} Mins`
    : 'Standard';
  const imageUrl = firstItem?.subService.imageUrl || cart.category?.imageUrl;

  const userLat = userLoc.location?.latitude || 17.4485;
  const userLng = userLoc.location?.longitude || 78.3748;

  // 1. Fetch Nearby Workers for Instant Booking
  useEffect(() => {
    let mounted = true;
    const fetchNearby = async () => {
      setNearbyLoading(true);
      setNearbyError('');
      try {
        const workers = await bookingApi.getNearbyWorkers(userLat, userLng, serviceId, subServiceId);
        if (mounted) {
          setNearbyWorkers(workers);
          if (workers.length > 0) {
            const minEta = Math.min(...workers.map((w) => w.estimatedArrivalMinutes || 20));
            setInstantEtaMinutes(minEta);
          } else {
            setInstantEtaMinutes(25);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setNearbyError('Live partner check unavailable. Standard dispatch will be applied.');
          setInstantEtaMinutes(20);
        }
      } finally {
        if (mounted) setNearbyLoading(false);
      }
    };

    fetchNearby();
    return () => {
      mounted = false;
    };
  }, [userLat, userLng, serviceId, subServiceId]);

  // 2. Fetch Available Dates for Scheduled Booking
  useEffect(() => {
    let mounted = true;
    const fetchDates = async () => {
      setDatesLoading(true);
      try {
        const dates = await bookingApi.getAvailableDates(serviceId, subServiceId, 14);
        if (mounted && dates.length > 0) {
          setAvailableDates(dates);
          const firstAvailable = dates.find((d) => d.available) || dates[0];
          setSelectedDateStr(firstAvailable.date);
        }
      } catch (err) {
        // Fallback next 7 days if network error
        if (mounted) {
          const fallback = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            return {
              date: d.toISOString().split('T')[0],
              dayName: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
              monthName: d.toLocaleDateString('en-US', { month: 'short' }),
              dayOfMonth: d.getDate(),
              available: true,
              availableSlotsCount: 8,
            };
          });
          setAvailableDates(fallback);
          setSelectedDateStr(fallback[0].date);
        }
      } finally {
        if (mounted) setDatesLoading(false);
      }
    };

    fetchDates();
    return () => {
      mounted = false;
    };
  }, [serviceId, subServiceId]);

  // Active Hold Countdown Timer (Phase 1 / Phase 4)
  useEffect(() => {
    if (!cart.activeHold?.expiresAt) {
      setHoldSecondsRemaining(0);
      return;
    }
    const target = new Date(cart.activeHold.expiresAt).getTime();
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setHoldSecondsRemaining(remaining);
      if (remaining <= 0) {
        setActiveHold(null);
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [cart.activeHold?.expiresAt, setActiveHold]);

  const handleSelectSlot = async (slotTime: string) => {
    setSelectedSlotTime(slotTime);
    if (!serviceId || !selectedDateStr) return;

    setIsHoldingSlot(true);
    try {
      const pincode = cart.selectedAddress?.pincode || '500072';
      const hold = await bookingApi.holdSlot(serviceId, selectedDateStr, slotTime, pincode);
      if (hold && hold.holdId) {
        setActiveHold(hold);
      }
    } catch (err: any) {
      console.warn('[DateTimeScreen] Slot hold notice:', err?.message || err);
    } finally {
      setIsHoldingSlot(false);
    }
  };

  // 3. Fetch Dynamic Available Slots for the selected date
  useEffect(() => {
    if (!selectedDateStr) return;
    let mounted = true;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSlotsError('');
      try {
        const pincode = cart.selectedAddress?.pincode || '500072';
        if (serviceId) {
          try {
            const capacitySlots = await bookingApi.getCapacitySlots(serviceId, pincode, selectedDateStr);
            if (mounted && capacitySlots.length > 0) {
              const mapped: AvailableSlot[] = capacitySlots.map((cs) => ({
                time: cs.timeSlot,
                startTime: cs.startTime,
                endTime: cs.endTime,
                available: cs.available,
                period: cs.startTime.startsWith('0') || cs.startTime.startsWith('10') || cs.startTime.startsWith('11') ? 'MORNING' : 'AFTERNOON',
                availableWorkersCount: cs.availableCapacity,
              }));
              setAvailableSlots(mapped);
              const firstOpen = mapped.find((s) => s.available);
              if (firstOpen) {
                handleSelectSlot(firstOpen.time);
              }
              setSlotsLoading(false);
              return;
            }
          } catch {
            // Fallback to standard dynamic slots if capacity endpoint is in migration
          }
        }

        const slots = await bookingApi.getAvailableSlots(selectedDateStr, serviceId, subServiceId);
        if (mounted) {
          setAvailableSlots(slots);
          const firstOpen = slots.find((s) => s.available);
          if (firstOpen) {
            handleSelectSlot(firstOpen.time);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setSlotsError('Could not load slots for this date.');
          setAvailableSlots([]);
          setSelectedSlotTime(null);
        }
      } finally {
        if (mounted) setSlotsLoading(false);
      }
    };

    fetchSlots();
    return () => {
      mounted = false;
    };
  }, [selectedDateStr, serviceId, subServiceId]);

  const handleContinue = () => {
    if (mode === 'INSTANT') {
      setBookingType('INSTANT', instantEtaMinutes);
      // Set slot as current time for instant booking
      const now = new Date();
      const slotObj: TimeSlot = {
        time: 'Immediate Dispatch',
        available: true,
        date: now.toISOString().split('T')[0],
      };
      setSlot(slotObj, now.toISOString().split('T')[0]);
      router.push('/booking/summary');
    } else {
      if (!selectedSlotTime) {
        alert('Please select an available time slot.');
        return;
      }
      setBookingType('SCHEDULED');
      const slotObj: TimeSlot = {
        time: selectedSlotTime,
        available: true,
        date: selectedDateStr,
      };
      setSlot(slotObj, selectedDateStr);
      router.push('/booking/summary');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Select Booking Type</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 100 + Math.max(insets.bottom, 16) },
        ]}
      >
        {/* Dual Booking Mode Toggle Cards */}
        <View style={styles.modeToggleSection}>
          <Text style={styles.sectionSubtitle}>HOW WOULD YOU LIKE TO BOOK?</Text>

          <View style={styles.toggleRow}>
            {/* Instant Booking Tab */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.modeCard,
                mode === 'INSTANT' && styles.modeCardActive,
                mode === 'INSTANT' && { borderColor: '#10B981' },
              ]}
              onPress={() => setMode('INSTANT')}
            >
              <View style={styles.modeCardHeader}>
                <View
                  style={[
                    styles.modeIconCircle,
                    { backgroundColor: mode === 'INSTANT' ? '#D1FAE5' : '#F3F4F6' },
                  ]}
                >
                  <Zap size={20} color={mode === 'INSTANT' ? '#059669' : '#6B7280'} />
                </View>
                {mode === 'INSTANT' && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>FASTEST</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.modeTitle, mode === 'INSTANT' && styles.modeTitleActive]}>
                Instant Booking
              </Text>
              <Text style={styles.modeDesc}>Arrives in ~{instantEtaMinutes} mins</Text>
              <View style={styles.modeFooter}>
                <Text style={styles.modeFooterText}>Doorstep service now</Text>
              </View>
            </TouchableOpacity>

            {/* Scheduled Booking Tab */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.modeCard,
                mode === 'SCHEDULED' && styles.modeCardActive,
                mode === 'SCHEDULED' && { borderColor: Colors.primary },
              ]}
              onPress={() => setMode('SCHEDULED')}
            >
              <View style={styles.modeCardHeader}>
                <View
                  style={[
                    styles.modeIconCircle,
                    { backgroundColor: mode === 'SCHEDULED' ? '#EFF6FF' : '#F3F4F6' },
                  ]}
                >
                  <Calendar size={20} color={mode === 'SCHEDULED' ? Colors.primary : '#6B7280'} />
                </View>
              </View>
              <Text style={[styles.modeTitle, mode === 'SCHEDULED' && styles.modeTitleActive]}>
                Schedule Later
              </Text>
              <Text style={styles.modeDesc}>Pick date & slot</Text>
              <View style={styles.modeFooter}>
                <Text style={styles.modeFooterText}>Up to 14 days ahead</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 1. INSTANT BOOKING VIEW ────────────────────────────────────── */}
        {mode === 'INSTANT' && (
          <View style={styles.instantSection}>
            {/* Live Location Pill */}
            <View style={styles.locationPillCard}>
              <View style={styles.locationPillIcon}>
                <MapPin size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationLabel}>SERVICE LOCATION</Text>
                <Text style={styles.locationAddress} numberOfLines={1}>
                  {userLoc.address?.addressLine || 'Hitech City, Hyderabad'}
                </Text>
              </View>
              <View style={styles.livePulseBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>GPS Active</Text>
              </View>
            </View>

            {/* ETA Banner */}
            <View style={styles.etaBanner}>
              <View style={styles.etaLeft}>
                <Text style={styles.etaSub}>ESTIMATED ARRIVAL</Text>
                <Text style={styles.etaValue}>~{instantEtaMinutes} Minutes</Text>
                <Text style={styles.etaNote}>
                  {nearbyWorkers.length > 0
                    ? `${nearbyWorkers.length} verified partner${nearbyWorkers.length > 1 ? 's' : ''} active nearby`
                    : 'Dispatching closest available partner'}
                </Text>
              </View>
              <View style={styles.etaIconWrapper}>
                <Clock size={32} color="#059669" />
              </View>
            </View>

            {/* Nearby Partners Preview */}
            <View style={styles.nearbySection}>
              <Text style={styles.sectionTitle}>Nearby Service Partners</Text>
              {nearbyLoading ? (
                <View style={styles.loaderBox}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.loadingText}>Scanning nearby partners...</Text>
                </View>
              ) : nearbyWorkers.length === 0 ? (
                <View style={styles.infoCard}>
                  <Users size={20} color="#6B7280" />
                  <Text style={styles.infoText}>
                    Partners are active in your area. Upon booking, we will match and dispatch the nearest partner immediately.
                  </Text>
                </View>
              ) : (
                <View style={styles.workersList}>
                  {nearbyWorkers.slice(0, 3).map((w) => (
                    <View key={w.workerId} style={styles.workerRow}>
                      <View style={styles.workerAvatarPlaceholder}>
                        <Text style={styles.workerInitial}>
                          {w.fullName ? w.fullName.charAt(0) : 'P'}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.workerName}>{w.fullName}</Text>
                        <View style={styles.workerMetaRow}>
                          <Star size={12} color="#F59E0B" fill="#F59E0B" />
                          <Text style={styles.workerRating}>{w.rating || '4.9'}</Text>
                          <Text style={styles.workerDot}>•</Text>
                          <Text style={styles.workerDistance}>
                            {w.distanceMeters ? `${(w.distanceMeters / 1000).toFixed(1)} km away` : 'Nearby'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.etaPill}>
                        <Text style={styles.etaPillText}>~{w.estimatedArrivalMinutes || 18}m</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* How Instant Works Card */}
            <View style={styles.howItWorksCard}>
              <Text style={styles.howTitle}>How Instant Booking Works</Text>
              <View style={styles.stepRow}>
                <CheckCircle size={16} color="#059669" />
                <Text style={styles.stepText}>Confirm booking and get a 4-digit verification PIN.</Text>
              </View>
              <View style={styles.stepRow}>
                <CheckCircle size={16} color="#059669" />
                <Text style={styles.stepText}>Nearest partner accepts within 60 seconds.</Text>
              </View>
              <View style={styles.stepRow}>
                <CheckCircle size={16} color="#059669" />
                <Text style={styles.stepText}>Track partner's live GPS route to your doorstep.</Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── 2. SCHEDULED BOOKING VIEW ──────────────────────────────────── */}
        {mode === 'SCHEDULED' && (
          <View style={styles.scheduledSection}>
            {/* Interactive Calendar Strip */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Date</Text>
              {datesLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 15 }} />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.daysScroll}
                >
                  {availableDates.map((d) => {
                    const isSelected = d.date === selectedDateStr;
                    return (
                      <Pressable
                        key={d.date}
                        style={[
                          styles.datePill,
                          isSelected && styles.datePillSelected,
                          !d.available && styles.datePillDisabled,
                        ]}
                        onPress={() => {
                          if (d.available) setSelectedDateStr(d.date);
                        }}
                        disabled={!d.available}
                      >
                        <Text
                          style={[
                            styles.dateDayName,
                            isSelected && styles.dateDayNameSelected,
                            !d.available && { color: '#9CA3AF' },
                          ]}
                        >
                          {d.dayName}
                        </Text>
                        <Text
                          style={[
                            styles.dateNumber,
                            isSelected && styles.dateNumberSelected,
                            !d.available && { color: '#9CA3AF' },
                          ]}
                        >
                          {d.dayOfMonth} {d.monthName}
                        </Text>
                        {d.available ? (
                          <View
                            style={[
                              styles.availDot,
                              { backgroundColor: isSelected ? '#FFFFFF' : '#10B981' },
                            ]}
                          />
                        ) : (
                          <Text style={styles.bookedText}>Full</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Dynamic Time Slot Grid */}
            <View style={styles.section}>
              <View style={styles.slotHeaderRow}>
                <Text style={styles.sectionTitle}>Select Available Time Slot</Text>
                <Text style={styles.slotSubtext}>Calculated from partner availability</Text>
              </View>

              {slotsLoading ? (
                <View style={styles.loaderBox}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.loadingText}>Checking real-time partner schedules...</Text>
                </View>
              ) : slotsError ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={18} color="#EF4444" />
                  <Text style={styles.errorText}>{slotsError}</Text>
                </View>
              ) : availableSlots.length === 0 ? (
                <View style={styles.noSlotsBox}>
                  <Text style={styles.noSlotsText}>No slots open on this date. Please select another date.</Text>
                </View>
              ) : (
                <View style={styles.slotsGrid}>
                  {availableSlots
                    .filter((s) => s.available) // Requirement: "Hide unavailable slots"
                    .map((slot) => {
                      const isSelected = selectedSlotTime === slot.time;
                      return (
                        <Pressable
                          key={slot.time}
                          style={[
                            styles.slotCard,
                            isSelected && styles.slotCardSelected,
                          ]}
                          onPress={() => handleSelectSlot(slot.time)}
                        >
                          <Text
                            style={[
                              styles.slotTimeText,
                              isSelected && styles.slotTimeTextSelected,
                            ]}
                          >
                            {slot.time}
                          </Text>
                          {slot.availableWorkersCount > 0 && (
                            <Text
                              style={[
                                styles.slotPartnerCount,
                                isSelected && { color: 'rgba(255,255,255,0.85)' },
                              ]}
                            >
                              {slot.availableWorkersCount} partner{slot.availableWorkersCount > 1 ? 's' : ''} free
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Selected Service Summary Card */}
        <View style={styles.serviceSection}>
          <Text style={styles.sectionTitle}>Selected Service</Text>
          <View style={styles.serviceCard}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.serviceThumb} contentFit="cover" />
            ) : (
              <View style={[styles.serviceThumb, { backgroundColor: '#E0E7FF' }]} />
            )}
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{selectedItemName}</Text>
              <View style={styles.serviceMetaRow}>
                <Clock size={12} color="#6B7280" />
                <Text style={styles.serviceDuration}>{durationText}</Text>
              </View>
              <Text style={styles.servicePrice}>₹{selectedItemPrice}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Active Hold Countdown Banner (Phase 1 / Phase 4) */}
      {mode === 'SCHEDULED' && holdSecondsRemaining > 0 && (
        <View style={styles.holdBanner}>
          <View style={styles.holdBannerLeft}>
            <View style={styles.holdPulseDot} />
            <Text style={styles.holdBannerText}>
              Slot Reserved:{' '}
              <Text style={styles.holdBannerTimer}>
                {Math.floor(holdSecondsRemaining / 60)}:{(holdSecondsRemaining % 60).toString().padStart(2, '0')}
              </Text>{' '}
              remaining
            </Text>
          </View>
          <Text style={styles.holdBannerSub}>Capacity held</Text>
        </View>
      )}

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.bottomBarInfo}>
          <Text style={styles.bottomBarTypeLabel}>
            {mode === 'INSTANT' ? '⚡ INSTANT ARRIVAL' : '📅 SCHEDULED APPOINTMENT'}
          </Text>
          <Text style={styles.bottomBarSlotText}>
            {mode === 'INSTANT' ? `ETA ~${instantEtaMinutes} mins` : selectedSlotTime || 'Select a slot'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.continueBtn,
            mode === 'INSTANT' && { backgroundColor: '#059669' },
            mode === 'SCHEDULED' && !selectedSlotTime && { backgroundColor: '#9CA3AF' },
          ]}
          onPress={handleContinue}
          disabled={mode === 'SCHEDULED' && !selectedSlotTime}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>
            {mode === 'INSTANT' ? 'Book Now ⚡' : 'Review & Confirm ›'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  backArrow: {
    fontSize: 26,
    color: '#111827',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  headerRightPlaceholder: {
    width: 36,
  },
  scroll: {
    padding: 16,
  },

  // Mode Toggle
  modeToggleSection: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#6B7280',
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...Shadows.sm,
  },
  modeCardActive: {
    backgroundColor: '#FFFFFF',
    ...Shadows.md,
  },
  modeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 2,
  },
  modeTitleActive: {
    color: '#111827',
  },
  modeDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  modeFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 6,
  },
  modeFooterText: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Instant Section
  instantSection: {
    marginBottom: 20,
  },
  locationPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationPillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  livePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },

  etaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  etaLeft: {
    flex: 1,
  },
  etaSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  etaValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#065F46',
    marginBottom: 4,
  },
  etaNote: {
    fontSize: 12,
    color: '#047857',
  },
  etaIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },

  nearbySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  loaderBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  workersList: {
    gap: 10,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  workerAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  workerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  workerRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  workerDot: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  workerDistance: {
    fontSize: 12,
    color: '#6B7280',
  },
  etaPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  etaPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  howItWorksCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  howTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
  },

  // Scheduled Section
  scheduledSection: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  daysScroll: {
    paddingRight: 16,
    gap: 10,
  },
  datePill: {
    width: 72,
    height: 84,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    ...Shadows.sm,
  },
  datePillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  datePillDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  dateDayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  dateDayNameSelected: {
    color: '#FFFFFF',
  },
  dateNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  dateNumberSelected: {
    color: '#FFFFFF',
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  bookedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 4,
  },

  slotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  slotSubtext: {
    fontSize: 11,
    color: '#6B7280',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCard: {
    width: (width - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    ...Shadows.sm,
  },
  slotCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  slotTimeTextSelected: {
    color: '#FFFFFF',
  },
  slotPartnerCount: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  noSlotsBox: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  noSlotsText: {
    color: '#6B7280',
    fontSize: 13,
  },

  // Service Card
  serviceSection: {
    marginBottom: 20,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  serviceThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  serviceDuration: {
    fontSize: 12,
    color: '#6B7280',
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 4,
  },

  // Sticky Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.lg,
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarTypeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  bottomBarSlotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  continueBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
    ...Shadows.sm,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  holdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
  },
  holdBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holdPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#074BD4',
  },
  holdBannerText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#1E40AF',
  },
  holdBannerTimer: {
    fontFamily: Typography.fontFamily.bold,
    color: '#074BD4',
  },
  holdBannerSub: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#059669',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
