/**
 * Track Service Screen — Real-Time Live GPS tracking using Google Maps & Expo Location.
 *
 * Route: /booking/track/[id]
 *
 * Features:
 * - Real-time foreground customer GPS detection with expo-location (blue pulsing dot)
 * - Service partner moving vehicle marker with real-time bearing rotation
 * - Turn-by-turn road polyline geometry from routing service (never straight lines)
 * - Truthful GPS connection status & stale signal handling
 * - Dedicated handling for SEARCHING, WORKER_NOT_FOUND, ACCEPTED, IN_PROGRESS, COMPLETED
 * - Secure Start Service PIN with 1-tap copy
 * - Floating recenter, fit-bounds, and zoom map controls
 * - Emergency SOS dialog
 * - Complete responsive layout with safe-area insets
 */

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Linking,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { bookingApi, Booking } from '../../../src/api/client';
import { GoogleMapTracker } from '../../../src/components/map/GoogleMapTracker';
import { GoogleMapHandle } from '../../../src/components/map/GoogleMapView';
import { useLiveTracking } from '../../../src/hooks/useLiveTracking';
import { useCustomerLocation } from '../../../src/hooks/useCustomerLocation';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';
import { isValidCoordinate } from '../../../src/services/coordinates';
import { RatingModal, RadarSearchingView } from '../../../src/components/common';
import { TrackingLifecycleManager } from '../../../src/services/TrackingLifecycleManager';

const { width } = Dimensions.get('window');

const TRACKING_STEPS = [
  { key: 'SEARCHING', label: 'Requested', sub: 'Searching nearby' },
  { key: 'ACCEPTED', label: 'Assigned', sub: 'Partner on the way' },
  { key: 'IN_PROGRESS', label: 'In Progress', sub: 'Service active' },
  { key: 'COMPLETED', label: 'Completed', sub: 'Delivered' },
];

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; bookingId?: string }>();
  const id = params.id || params.bookingId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [pinCopied, setPinCopied] = useState(false);
  const [servicePin, setServicePin] = useState<string | null>(null);
  const [isFetchingPin, setIsFetchingPin] = useState(false);
  const [pinFetchError, setPinFetchError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isRetryingSearch, setIsRetryingSearch] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [hasShownRating, setHasShownRating] = useState(false);

  useEffect(() => {
    if (booking?.status === 'COMPLETED' && !hasShownRating) {
      setIsRatingModalVisible(true);
      setHasShownRating(true);
    }
  }, [booking?.status, hasShownRating]);

  const mapRef = useRef<GoogleMapHandle>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const requestSequence = useRef(0);

  // 1. Foreground Customer Live Device GPS
  const {
    coords: customerGps,
    isLocating,
    gpsEnabled,
    permissionGranted,
    permissionDenied,
    error: gpsError,
    refreshGps,
  } = useCustomerLocation(true);

  // 2. Fetch Booking Data
  const fetchBooking = useCallback(async () => {
    if (!id) {
      setBookingError('A booking ID is required to view tracking.');
      return;
    }
    const sequence = ++requestSequence.current;
    try {
      const data = await bookingApi.getBookingById(id);
      if (sequence === requestSequence.current && data.bookingId === id) {
        setBooking(data);
        setBookingError(null);
      } else if (sequence === requestSequence.current) {
        setBooking(null);
        setBookingError('The requested booking could not be verified.');
      }
    } catch (e: any) {
      if (sequence === requestSequence.current) {
        setBookingError(e?.message || 'Unable to load booking details.');
      }
    }
  }, [id]);

  // 2b. Fetch Service Start PIN (Only authorized customer, when status is ARRIVED)
  const fetchServicePin = useCallback(async () => {
    if (!id) return;
    setIsFetchingPin(true);
    setPinFetchError(null);
    try {
      const response = await bookingApi.getServicePin(id);
      if (response?.pinCode) {
        setServicePin(response.pinCode);
      }
    } catch (err: any) {
      console.warn('[TrackingScreen] Could not fetch service PIN:', err?.message);
      setPinFetchError(err?.message || 'Failed to retrieve PIN');
    } finally {
      setIsFetchingPin(false);
    }
  }, [id]);

  // Polling with fast cadence on SEARCHING / ARRIVED / ACCEPTED
  useEffect(() => {
    fetchBooking();
    if (booking?.status === 'COMPLETED' || booking?.status === 'CANCELLED') return;
    const pollInterval =
      booking?.status === 'SEARCHING'
        ? 3500
        : booking?.status === 'ACCEPTED' || booking?.status === 'ON_THE_WAY'
        ? 4000
        : 8000;
    pollingRef.current = setInterval(fetchBooking, pollInterval);
    return () => {
      requestSequence.current += 1;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchBooking, booking?.status]);

  // Automatic retrieval of PIN when status is ARRIVED, and clearing on IN_PROGRESS
  useEffect(() => {
    if (booking?.status === 'ARRIVED') {
      if (!servicePin && !isFetchingPin) {
        void fetchServicePin();
      }
    } else if (
      booking?.status === 'IN_PROGRESS' ||
      booking?.status === 'COMPLETED' ||
      booking?.status === 'CANCELLED'
    ) {
      if (servicePin) {
        setServicePin(null);
      }
    }
  }, [booking?.status, servicePin, isFetchingPin, fetchServicePin]);

  // Booking lifecycle events (ARRIVED, SERVICE_STARTED, ...) arrive on the SINGLE socket owned by
  // useLiveTracking. Reactive update: immediately reflect lifecycle changes in local state without delay.
  const handleBookingEvent = useCallback(
    (event: Record<string, any>) => {
      const eventStatus = (event.status || event.reason || event.type || '').toUpperCase();
      if (
        eventStatus === 'ARRIVED' ||
        eventStatus === 'WORKER_ARRIVED' ||
        event.type === 'WORKER_ARRIVED'
      ) {
        if (id) TrackingLifecycleManager.getInstance().markArrived(id);
        setBooking((prev) => (prev ? { ...prev, status: 'ARRIVED' } : null));
        void fetchServicePin();
      } else if (
        eventStatus === 'IN_PROGRESS' ||
        eventStatus === 'SERVICE_STARTED' ||
        event.type === 'SERVICE_STARTED'
      ) {
        if (id) TrackingLifecycleManager.getInstance().stopTracking(id, 'IN_PROGRESS');
        setBooking((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
        setServicePin(null);
      } else if (
        eventStatus === 'COMPLETED' ||
        eventStatus === 'SERVICE_COMPLETED' ||
        event.type === 'SERVICE_COMPLETED'
      ) {
        if (id) TrackingLifecycleManager.getInstance().stopTracking(id, 'COMPLETED');
        setBooking((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
      } else if (
        eventStatus === 'CANCELLED' ||
        eventStatus === 'BOOKING_CANCELLED' ||
        event.type === 'BOOKING_CANCELLED' ||
        (event.type === 'BOOKING_TRACKING_STOPPED' && (eventStatus.includes('CANCEL') || event.status === 'CANCELLED'))
      ) {
        if (id) TrackingLifecycleManager.getInstance().stopTracking(id, 'CANCELLED');
        setBooking((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      } else if (eventStatus === 'WORKER_ON_THE_WAY' || eventStatus === 'ON_THE_WAY') {
        if (id) TrackingLifecycleManager.getInstance().markTravelling(id);
        setBooking((prev) => (prev ? { ...prev, status: 'ON_THE_WAY' } : null));
      }
      void fetchBooking();
    },
    [id, fetchBooking, fetchServicePin],
  );

  useEffect(() => {
    setBooking(null);
    setBookingError(null);
  }, [id]);

  // DESTINATION = the booking's PERSISTED service address (userLat/userLng from GET /bookings/{id}), and
  // nothing else. It is deliberately NOT replaced by a pincode centroid, the customer's current GPS, a default
  // city, or an "override" for particular pincodes: a wrong destination is worse than no destination.
  // The route itself never uses this value - the server derives the destination from the booking.
  const bookingLat = booking ? Number(booking.userLat) : NaN;
  const bookingLng = booking ? Number(booking.userLng) : NaN;
  const hasValidBookingCoords =
    isValidCoordinate(bookingLat, bookingLng) && !(bookingLat === 0 && bookingLng === 0);
  const destLat: number | undefined = hasValidBookingCoords ? bookingLat : undefined;
  const destLng: number | undefined = hasValidBookingCoords ? bookingLng : undefined;
  const destinationMissing = Boolean(booking) && !hasValidBookingCoords;

  const bookingPin = (booking as any)?.servicePincode || (booking as any)?.pincode;
  const customerAddress =
    (booking as any)?.customerAddress ||
    booking?.userLocation ||
    (bookingPin ? `Service Address — ${bookingPin}` : undefined) ||
    'Your Service Location';

  // Keeps the worker, destination and road above the bottom panel when the map is fitted. Memoised so the map
  // does not see a "new" padding object (and re-run its camera effect) on every render.
  const mapFitPadding = useMemo(
    () => ({ top: 90, right: 56, bottom: isMapExpanded ? 150 : 110, left: 56 }),
    [isMapExpanded],
  );

  // 3. Live Partner Travel Tracking (ONLY active while partner is moving/travelling to customer)
  // Automatically stops upon ARRIVED, IN_PROGRESS, COMPLETED, or CANCELLED
  const trackingEnabled =
    !!booking?.workerId &&
    (booking.status === 'ACCEPTED' ||
      booking.status === 'CONFIRMED' ||
      booking.status === 'ON_THE_WAY');

  const {
    partnerPos,
    hasPartnerLocation,
    isLiveConnected,
    trackingError,
    isGpsStale,
    routeCoordinates,
    routeNotice,
    distanceText,
    etaText,
    etaSeconds,
    lastUpdateTimestamp,
  } = useLiveTracking({
    bookingId: id,
    status: booking?.status,
    workerId: booking?.workerId,
    enabled: trackingEnabled,
    pollIntervalMs: 7000,
    onBookingEvent: handleBookingEvent,
  });

  const handleCall = () => {
    if (booking?.workerPhone) {
      Linking.openURL(`tel:${booking.workerPhone}`);
    } else {
      Alert.alert(
        'Partner Contact',
        'Partner contact details will be enabled once a service professional is assigned to your booking.'
      );
    }
  };

  const handleChat = () => {
    router.push('/(tabs)/notifications');
  };

  /** Safety line from the build config (EXPO_PUBLIC_SUPPORT_PHONE). Never a placeholder; 112 is the national emergency number. */
  const callSafetyLine = () => {
    const support = process.env.EXPO_PUBLIC_SUPPORT_PHONE?.trim();
    void Linking.openURL(`tel:${support || '112'}`);
  };

  const handleEmergencySOS = () => {
    const hasSupportLine = Boolean(process.env.EXPO_PUBLIC_SUPPORT_PHONE?.trim());
    Alert.alert(
      'Emergency SOS',
      hasSupportLine
        ? 'Need urgent help? Call HomeEase safety support, or 112 for police / ambulance.'
        : 'Need urgent help? Call 112 for police / ambulance.',
      [
        { text: 'Cancel', style: 'cancel' },
        ...(hasSupportLine
          ? [{ text: 'Call 112', onPress: () => void Linking.openURL('tel:112') }]
          : []),
        {
          text: hasSupportLine ? 'Call Safety Support' : 'Call 112',
          style: 'destructive' as const,
          onPress: () => callSafetyLine(),
        },
      ]
    );
  };

  const handleCopyPin = async () => {
    const pin =
      servicePin ||
      (booking?.pinCode && booking.pinCode !== '****' && booking.pinCode !== '0000'
        ? booking.pinCode
        : null);
    if (pin) {
      try {
        await Clipboard.setStringAsync(pin);
        setPinCopied(true);
        setTimeout(() => setPinCopied(false), 2500);
      } catch (err) {
        // Fallback
      }
    }
  };

  const handleRetrySearch = async () => {
    if (!id) return;
    setIsRetryingSearch(true);
    try {
      const effLat = destLat ?? customerGps?.latitude ?? 17.4485;
      const effLng = destLng ?? customerGps?.longitude ?? 78.3748;
      const result = await bookingApi.retryMatching(id, effLat, effLng);
      if (result.status === 'CANDIDATES_ALERTED' || (result as any).status === 'DISPATCHING') {
        Alert.alert(
          'Matching Nearby Partner',
          'We have alerted verified service professionals near your address. Please wait a moment while a partner accepts.'
        );
      } else {
        Alert.alert(
          'No Partner Available',
          result.message || 'No active service professionals were found within 5 km. You may retry again or reschedule.'
        );
      }
      await fetchBooking();
      await refreshGps();
    } catch (e: any) {
      Alert.alert('Matching Retry', e?.message || 'Unable to trigger partner matching.');
    } finally {
      setIsRetryingSearch(false);
    }
  };

  const handleSimulateAssignment = async () => {
    if (!id) return;
    try {
      const VERIFIED_WORKER_USER_ID = '0d3dd87e-2cc0-46a9-9177-8e5a541a36e9';
      const updated = await bookingApi.acceptBookingAsWorker(id, VERIFIED_WORKER_USER_ID);
      setBooking(updated);
      Alert.alert(
        'Partner Assigned',
        `Partner ${updated.workerName || 'Service Partner'} accepted the booking request. Doorstep PIN will be revealed once partner arrives.`
      );
    } catch (e: any) {
      Alert.alert('Assignment', e?.message || 'Failed to accept booking on backend.');
    }
  };

  const handleCancelBooking = () => {
    if (!id) return;

    if (booking?.status === 'IN_PROGRESS') {
      Alert.alert(
        'Service In Progress',
        'Your service partner has already started the service. In-progress services cannot be cancelled from the app. Please contact support if you need immediate assistance.'
      );
      return;
    }

    if (booking?.status === 'COMPLETED') {
      Alert.alert('Booking Completed', 'This booking has already been marked completed.');
      return;
    }

    let policyNotice = 'Free cancellation applies. No charges will be deducted.';
    if (booking?.status === 'ON_THE_WAY' || booking?.status === 'ARRIVED') {
      policyNotice = 'Your service partner has already dispatched or arrived. A partner transit compensation fee of ₹49 may apply.';
    } else if (booking?.status === 'ACCEPTED') {
      policyNotice = 'Your partner was just assigned. Free cancellation within the initial dispatch window.';
    }

    Alert.alert(
      'Cancel Booking',
      `${policyNotice}\n\nAre you sure you want to proceed with cancelling this booking?`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            // Instantly stop client-side live tracking and abort any pending location/route polling
            TrackingLifecycleManager.getInstance().stopTracking(id, 'CANCELLED');

            // Optimistically update local booking state so the live map immediately unmounts
            setBooking((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'CANCELLED',
                    cancellationReason: 'Customer cancelled request from tracking screen',
                  }
                : null
            );

            try {
              await bookingApi.cancelBooking(id, 'Customer cancelled request from tracking screen');
              await fetchBooking();
            } catch (err: any) {
              const msg = err?.message || '';
              if (
                msg.includes('CANCELLED') ||
                msg.includes('already') ||
                msg.includes('CONCURRENT') ||
                msg.includes('modified') ||
                msg.includes('unexpected row count') ||
                msg.includes('version') ||
                msg.includes('StaleObject')
              ) {
                // Booking was successfully cancelled or state was modified concurrently
                await fetchBooking();
              } else {
                Alert.alert('Cancellation Notice', 'Cancellation requested. Refreshing booking status...');
                await fetchBooking();
              }
            }
          },
        },
      ]
    );
  };

  const getActiveStepIndex = (status?: string) => {
    switch (status) {
      case 'PENDING':
      case 'REQUESTED':
      case 'SEARCHING':
      case 'WORKER_NOT_FOUND':
        return 0;
      case 'ACCEPTED':
      case 'CONFIRMED':
      case 'ON_THE_WAY':
      case 'ARRIVED':
        return 1;
      case 'IN_PROGRESS':
        return 2;
      case 'COMPLETED':
        return 3;
      default:
        return 0;
    }
  };

  const activeStepIdx = getActiveStepIndex(booking?.status);

  // Status message computation
  const statusSummary = useMemo(() => {
    if (bookingError) return { title: 'Booking Notice', desc: bookingError, badgeColor: '#EF4444' };
    if (!booking) return { title: 'Connecting...', desc: 'Verifying booking credentials', badgeColor: '#6B7280' };

    switch (booking.status) {
      case 'PENDING':
      case 'REQUESTED':
      case 'SEARCHING':
        return {
          title: 'Matching Nearby Partner',
          desc: 'Alerting verified service professionals in your area...',
          badgeColor: '#F59E0B',
        };
      case 'WORKER_NOT_FOUND':
        return {
          title: 'No Partner Nearby Right Now',
          desc: 'All verified partners within 5 km are currently engaged with active jobs.',
          badgeColor: '#EF4444',
        };
      case 'CONFIRMED':
      case 'ACCEPTED':
        return {
          title: 'Partner Assigned',
          desc: `${booking.workerName || 'Your partner'} has accepted your booking and will start travel shortly.`,
          badgeColor: '#3B82F6',
        };
      case 'ON_THE_WAY':
        if (!hasPartnerLocation) {
          return {
            title: 'Partner En Route',
            desc: `Awaiting GPS broadcast from ${booking.workerName || 'your partner'}...`,
            badgeColor: '#3B82F6',
          };
        }
        if (isGpsStale) {
          return {
            title: 'Partner En Route',
            desc: 'GPS signal paused • Partner is approaching your location',
            badgeColor: '#F59E0B',
          };
        }
        return {
          title: 'Partner En Route',
          // Only a real, route-derived ETA is ever shown; otherwise say why it is missing.
          desc:
            etaSeconds !== null
              ? `Arriving in approximately ${etaText}`
              : routeNotice || 'Live tracking active',
          badgeColor: '#10B981',
        };
      case 'ARRIVED':
        return {
          title: 'Partner Has Arrived',
          desc: 'Your partner is at your doorstep. Share your 4-digit PIN below to start the service.',
          badgeColor: '#10B981',
        };
      case 'IN_PROGRESS':
        return {
          title: 'Service in Progress',
          desc: `${booking.workerName || 'Service partner'} is currently performing your service.`,
          badgeColor: '#10B981',
        };
      case 'COMPLETED':
        return {
          title: 'Service Completed',
          desc: 'Your home service has been successfully completed.',
          badgeColor: '#10B981',
        };
      case 'CANCELLED':
        return {
          title: 'Booking Cancelled',
          desc: 'This service booking request has been cancelled.',
          badgeColor: '#6B7280',
        };
      default:
        return {
          title: 'Live Tracking',
          desc: 'Connecting to tracking updates...',
          badgeColor: '#3B82F6',
        };
    }
  }, [booking, bookingError, hasPartnerLocation, isGpsStale, etaText, etaSeconds, routeNotice]);

  // =========================================================================
  // 1. CANCELLED STATE: No live tracking map. Clean status with refund info.
  // =========================================================================
  if (booking?.status === 'CANCELLED') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace('/(tabs)/bookings')}
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Booking Cancelled</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {booking?.serviceName ? `${booking.serviceName} • ` : ''}
              #{id?.substring(0, 8).toUpperCase()}
            </Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.terminalStateScroll} showsVerticalScrollIndicator={false}>
          {/* Hero Banner */}
          <View style={styles.cancelledHeroWrap}>
            <View style={styles.cancelledHeroIcon}>
              <Ionicons name="close-circle" size={54} color="#DC2626" />
            </View>
            <Text style={styles.cancelledHeroTitle}>Booking Cancelled</Text>
            <Text style={styles.cancelledHeroDesc}>
              This booking has been cancelled. Road tracking is closed and no technician will visit.
            </Text>
          </View>

          {/* Details Card */}
          <View style={styles.terminalDetailsCard}>
            <Text style={styles.terminalCardHeader}>Booking Summary</Text>
            
            <View style={styles.terminalDetailRow}>
              <Text style={styles.terminalDetailLabel}>Service</Text>
              <Text style={styles.terminalDetailValue}>{booking?.serviceName || 'HomeEase Service'}</Text>
            </View>
            
            <View style={styles.terminalDetailRow}>
              <Text style={styles.terminalDetailLabel}>Booking ID</Text>
              <Text style={styles.terminalDetailValue}>#{id?.substring(0, 8).toUpperCase()}</Text>
            </View>

            <View style={styles.terminalDetailRow}>
              <Text style={styles.terminalDetailLabel}>Reason</Text>
              <Text style={[styles.terminalDetailValue, { color: '#DC2626' }]}>
                {booking?.cancellationReason || 'Cancelled by customer'}
              </Text>
            </View>

            <View style={styles.terminalDetailRow}>
              <Text style={styles.terminalDetailLabel}>Service Location</Text>
              <Text style={styles.terminalDetailValue} numberOfLines={2}>
                {customerAddress}
              </Text>
            </View>
          </View>

          {/* Payment / Refund Status Card */}
          {booking?.paymentStatus === 'PAID' || booking?.paymentStatus === 'COMPLETED' ? (
            <View style={styles.refundNoticeCard}>
              <View style={styles.refundIconWrap}>
                <Ionicons name="shield-checkmark" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.refundNoticeTitle}>100% Refund Assurance</Text>
                <Text style={styles.refundNoticeDesc}>
                  A full refund has been automatically initiated to your original payment method (3–5 business days).
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.refundNoticeCard}>
              <View style={[styles.refundIconWrap, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="checkmark-circle-outline" size={22} color="#475569" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.refundNoticeTitle, { color: '#334155' }]}>No Charges Applied</Text>
                <Text style={[styles.refundNoticeDesc, { color: '#64748B' }]}>
                  No payment was collected for this booking. You have not been charged.
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.terminalActionsWrap}>
            <Pressable
              style={styles.primaryActionButton}
              onPress={() => router.replace('/(tabs)')}
              accessibilityRole="button"
            >
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Book Another Service</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionButton}
              onPress={() => router.replace('/(tabs)/bookings')}
              accessibilityRole="button"
            >
              <Ionicons name="list" size={18} color="#2563EB" />
              <Text style={styles.secondaryActionText}>View All Bookings</Text>
            </Pressable>

            <Pressable
              style={styles.textHelpButton}
              onPress={() => callSafetyLine()}
            >
              <Ionicons name="headset-outline" size={16} color="#64748B" />
              <Text style={styles.textHelpButtonText}>Need Help? Call 24/7 Support</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // 2. COMPLETED STATE: No live tracking map. Receipt summary & ratings.
  // =========================================================================
  if (booking?.status === 'COMPLETED') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace('/(tabs)/bookings')}
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Service Completed</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {booking?.serviceName ? `${booking.serviceName} • ` : ''}
              #{id?.substring(0, 8).toUpperCase()}
            </Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.terminalStateScroll} showsVerticalScrollIndicator={false}>
          {/* Hero Celebration */}
          <View style={styles.completedHeroWrap}>
            <View style={styles.completedHeroIcon}>
              <Ionicons name="checkmark-done-circle" size={54} color="#10B981" />
            </View>
            <Text style={styles.completedHeroTitle}>Service Completed!</Text>
            <Text style={styles.completedHeroDesc}>
              Your service has been delivered successfully. Thank you for choosing HomeEase.
            </Text>
          </View>

          {/* Partner Card */}
          {booking?.workerName && (
            <View style={styles.completedPartnerCard}>
              <View style={styles.workerAvatar}>
                <Text style={styles.workerAvatarText}>
                  {booking.workerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.completedPartnerName}>{booking.workerName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {booking.workerRating != null ? booking.workerRating.toFixed(1) : 'New partner'} • Verified Pro
                  </Text>
                </View>
                <Text style={styles.completedPartnerRole}>
                  {booking.serviceName ? `${booking.serviceName} Specialist` : 'Service Professional'}
                </Text>
              </View>
            </View>
          )}

          {/* Rate Partner Prompt */}
          <View style={styles.ratePartnerPromptCard}>
            <Text style={styles.ratePromptTitle}>How was your experience?</Text>
            <Text style={styles.ratePromptSub}>Help us maintain high quality service standards on HomeEase</Text>
            <Pressable
              style={styles.openRatingButton}
              onPress={() => setIsRatingModalVisible(true)}
            >
              <Ionicons name="star" size={18} color="#FFFFFF" />
              <Text style={styles.openRatingButtonText}>Rate Your Experience</Text>
            </Pressable>
          </View>

          {/* Invoice Summary Card */}
          <View style={styles.terminalDetailsCard}>
            <Text style={styles.terminalCardHeader}>Service & Payment Receipt</Text>
            <View style={styles.terminalDetailRow}>
              <Text style={styles.terminalDetailLabel}>Service</Text>
              <Text style={styles.terminalDetailValue}>{booking?.serviceName || 'HomeEase Service'}</Text>
            </View>
            <View style={styles.terminalDetailRow}>
              <Text style={styles.terminalDetailLabel}>
                {booking?.paymentStatus === 'PAID' || booking?.paymentStatus === 'COMPLETED'
                  ? 'Total Paid'
                  : 'Amount Payable'}
              </Text>
              <Text style={[styles.terminalDetailValue, { color: '#059669', fontFamily: Typography.fontFamily.bold }]}>
                ₹{booking?.totalAmount || (booking as any)?.finalPrice || '0'}
              </Text>
            </View>
            <View style={styles.terminalDetailRow}>
              <Text style={styles.terminalDetailLabel}>Payment Status</Text>
              <Text style={[styles.terminalDetailValue, { color: booking?.paymentStatus === 'PAID' || booking?.paymentStatus === 'COMPLETED' ? '#059669' : '#D97706' }]}>
                {booking?.paymentStatus === 'PAID' || booking?.paymentStatus === 'COMPLETED'
                  ? 'Paid Online'
                  : (booking as any)?.paymentMethod === 'COD' || (booking as any)?.paymentMode === 'COD'
                  ? 'Cash on Delivery (Pay to Partner)'
                  : (booking?.paymentStatus || 'Pending Payment')}
              </Text>
            </View>
            <View style={styles.terminalDetailRow}>
              <Text style={styles.terminalDetailLabel}>Service Address</Text>
              <Text style={styles.terminalDetailValue} numberOfLines={2}>
                {customerAddress}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.terminalActionsWrap}>
            <Pressable
              style={styles.primaryActionButton}
              onPress={() => router.replace('/(tabs)')}
              accessibilityRole="button"
            >
              <Ionicons name="home" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Back to Home</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionButton}
              onPress={() => router.replace('/(tabs)/bookings')}
              accessibilityRole="button"
            >
              <Ionicons name="list" size={18} color="#2563EB" />
              <Text style={styles.secondaryActionText}>View All Bookings</Text>
            </Pressable>
          </View>
        </ScrollView>

        <RatingModal
          visible={isRatingModalVisible}
          bookingId={id || ''}
          workerName={booking?.workerName}
          serviceName={booking?.serviceName}
          onClose={() => setIsRatingModalVisible(false)}
          onSubmitSuccess={() => {
            Alert.alert('Review Submitted', 'Thank you for rating your service experience!');
          }}
        />
      </View>
    );
  }

  // =========================================================================
  // 3. ARRIVED STATE: Partner reached doorstep! Travel route finished.
  //    Display prominent 4-digit Service Start PIN for customer to give partner.
  // =========================================================================
  if (booking?.status === 'ARRIVED') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Partner At Doorstep</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {booking?.serviceName ? `${booking.serviceName} • ` : ''}
              #{id?.substring(0, 8).toUpperCase()}
            </Text>
          </View>

          <Pressable
            style={styles.sosBtn}
            onPress={handleEmergencySOS}
            accessibilityLabel="Emergency SOS"
            hitSlop={8}
          >
            <Text style={styles.sosBtnText}>SOS</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.terminalStateScroll} showsVerticalScrollIndicator={false}>
          {/* Arrived Doorstep Banner */}
          <View style={styles.arrivedDoorstepHero}>
            <View style={styles.arrivedHeroIcon}>
              <Ionicons name="checkmark-circle" size={38} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.arrivedHeroTitle}>Partner Has Arrived!</Text>
              <Text style={styles.arrivedHeroDesc}>
                Your verified service partner is at your doorstep. Share your 4-digit PIN below to begin.
              </Text>
            </View>
          </View>

          {/* Dedicated 4-Digit Service Start PIN Card */}
          <View style={styles.securePinCardLarge}>
            <View style={styles.securePinHeader}>
              <View style={styles.securePinBadge}>
                <Ionicons name="shield-checkmark" size={15} color="#1D4ED8" />
                <Text style={styles.securePinBadgeText}>SERVICE START PIN</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.copyPinBtn, pressed && { opacity: 0.8 }]}
                onPress={handleCopyPin}
                accessibilityRole="button"
                accessibilityLabel="Copy PIN"
              >
                <Feather name={pinCopied ? 'check' : 'copy'} size={14} color="#1D4ED8" />
                <Text style={styles.copyPinBtnText}>{pinCopied ? 'Copied' : 'Copy PIN'}</Text>
              </Pressable>
            </View>

            {/* 4 Digit Display Boxes */}
            {isFetchingPin ? (
              <View style={styles.pinLoadingRow}>
                <ActivityIndicator size="small" color="#1D4ED8" />
                <Text style={styles.pinLoadingText}>Retrieving secure start PIN...</Text>
              </View>
            ) : (
              <View style={styles.pinDigitsRow}>
                {(servicePin || (booking?.pinCode && booking.pinCode !== '****' && booking.pinCode !== '0000' ? booking.pinCode : '----'))
                  .slice(0, 4)
                  .split('')
                  .map((digit, idx) => (
                    <View key={idx} style={styles.pinDigitBoxLarge}>
                      <Text style={styles.pinDigitTextLarge}>{digit}</Text>
                    </View>
                  ))}
              </View>
            )}

            {pinFetchError && !servicePin && (
              <Pressable style={styles.retryPinBtn} onPress={fetchServicePin}>
                <Ionicons name="refresh" size={14} color="#DC2626" />
                <Text style={styles.retryPinText}>Could not load PIN. Tap to retry.</Text>
              </Pressable>
            )}

            <View style={styles.pinInstructionRow}>
              <Ionicons name="information-circle-outline" size={16} color="#1E40AF" />
              <Text style={styles.securePinMessage}>
                Share this PIN with your service partner to verify and start the service.
              </Text>
            </View>
            <Text style={styles.securePinHint}>
              For your safety, only share this 4-digit code when your service partner is present at your doorstep.
            </Text>
          </View>

          {/* Assigned Partner Card */}
          {booking?.workerName && (
            <View style={styles.arrivedPartnerCard}>
              <View style={styles.workerAvatar}>
                <Text style={styles.workerAvatarText}>
                  {booking.workerName.charAt(0).toUpperCase()}
                </Text>
                <View style={styles.onlineBadge} />
              </View>

              <View style={styles.workerMeta}>
                <Text style={styles.workerName}>{booking.workerName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {booking.workerRating != null ? booking.workerRating.toFixed(1) : 'New partner'} • Verified Pro
                  </Text>
                </View>
                <Text style={styles.workerRole}>
                  {booking.serviceName ? `${booking.serviceName} Specialist` : 'Service Partner'}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.actionCircle, styles.callBtn, !booking.workerPhone && { opacity: 0.5 }]}
                  onPress={handleCall}
                  accessibilityLabel="Call partner"
                >
                  <Ionicons name="call" size={18} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  style={[styles.actionCircle, styles.chatBtn]}
                  onPress={handleChat}
                  accessibilityLabel="Chat with partner"
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color="#1D4ED8" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Service Location Card */}
          <View style={styles.terminalDetailsCard}>
            <Text style={styles.terminalCardHeader}>Doorstep Service Location</Text>
            <View style={styles.terminalDetailRow}>
              <Ionicons name="location-sharp" size={18} color="#2563EB" style={{ marginRight: 8 }} />
              <Text style={[styles.terminalDetailValue, { flex: 1 }]}>{customerAddress}</Text>
            </View>
          </View>

          {/* Doorstep Verification Checklist */}
          <View style={styles.doorstepChecklistCard}>
            <Text style={styles.checklistTitle}>Doorstep Safety Checklist</Text>
            <View style={styles.checkItemRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.checkItemText}>Verify partner ID and HomeEase uniform</Text>
            </View>
            <View style={styles.checkItemRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.checkItemText}>Give 4-digit PIN to officially begin service</Text>
            </View>
            <View style={styles.checkItemRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.checkItemText}>Never share PIN before partner is at your door</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // 4. IN_PROGRESS STATE: Service is underway inside customer premises.
  // =========================================================================
  if (booking?.status === 'IN_PROGRESS') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Service In Progress</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {booking?.serviceName ? `${booking.serviceName} • ` : ''}
              #{id?.substring(0, 8).toUpperCase()}
            </Text>
          </View>

          <Pressable
            style={styles.sosBtn}
            onPress={handleEmergencySOS}
            accessibilityLabel="Emergency SOS"
            hitSlop={8}
          >
            <Text style={styles.sosBtnText}>SOS</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.terminalStateScroll} showsVerticalScrollIndicator={false}>
          {/* Active Service Hero Banner */}
          <View style={styles.inProgressHeroCard}>
            <View style={styles.inProgressHeroIcon}>
              <Ionicons name="hammer" size={28} color="#2563EB" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.inProgressStatusTag}>
                <View style={styles.inProgressBlinkDot} />
                <Text style={styles.inProgressStatusTagText}>ACTIVE SERVICE</Text>
              </View>
              <Text style={styles.inProgressHeroTitle}>Service In Progress</Text>
              <Text style={styles.inProgressHeroDesc}>
                Doorstep PIN verified. Your partner {booking?.workerName ? `${booking.workerName} ` : ''}is completing your service request.
              </Text>
            </View>
          </View>

          {/* Partner Card */}
          {booking?.workerName && (
            <View style={styles.arrivedPartnerCard}>
              <View style={styles.workerAvatar}>
                <Text style={styles.workerAvatarText}>
                  {booking.workerName.charAt(0).toUpperCase()}
                </Text>
                <View style={styles.onlineBadge} />
              </View>

              <View style={styles.workerMeta}>
                <Text style={styles.workerName}>{booking.workerName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {booking.workerRating != null ? booking.workerRating.toFixed(1) : 'New partner'} • Verified Pro
                  </Text>
                </View>
                <Text style={styles.workerRole}>
                  {booking.serviceName ? `${booking.serviceName} Specialist` : 'Service Partner'}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.actionCircle, styles.callBtn, !booking.workerPhone && { opacity: 0.5 }]}
                  onPress={handleCall}
                  accessibilityLabel="Call partner"
                >
                  <Ionicons name="call" size={18} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  style={[styles.actionCircle, styles.chatBtn]}
                  onPress={handleChat}
                  accessibilityLabel="Chat with partner"
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color="#1D4ED8" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Service Details Card */}
          <View style={styles.terminalDetailsCard}>
            <Text style={styles.terminalCardHeader}>Service Details</Text>
            <View style={styles.terminalDetailRow}>
              <Text style={styles.terminalDetailLabel}>Service</Text>
              <Text style={styles.terminalDetailValue}>{booking?.serviceName || 'HomeEase Service'}</Text>
            </View>
            <View style={styles.terminalDetailRow}>
              <Text style={styles.terminalDetailLabel}>Booking ID</Text>
              <Text style={styles.terminalDetailValue}>#{id?.substring(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.terminalDetailRow}>
              <Text style={styles.terminalDetailLabel}>Address</Text>
              <Text style={styles.terminalDetailValue} numberOfLines={2}>{customerAddress}</Text>
            </View>
          </View>

          {/* Quality Assurance Card */}
          <View style={styles.doorstepChecklistCard}>
            <Text style={styles.checklistTitle}>HomeEase Service Guarantee</Text>
            <View style={styles.checkItemRow}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.checkItemText}>Standardized pricing & genuine parts</Text>
            </View>
            <View style={styles.checkItemRow}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.checkItemText}>Pre-service inspection & post-work cleanup</Text>
            </View>
            <View style={styles.checkItemRow}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.checkItemText}>30-day HomeEase service protection</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // 5. TRAVEL & SEARCHING STATES (ON_THE_WAY, ACCEPTED, CONFIRMED, SEARCHING)
  //    Active Google Maps live tracking with walking female worker marker & blue road route.
  // =========================================================================

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {booking?.serviceName ? `${booking.serviceName} • ` : 'HomeEase Service • '}
            {id ? `#${id.substring(0, 8).toUpperCase()}` : ''}
          </Text>
        </View>

        <Pressable
          style={styles.sosBtn}
          onPress={handleEmergencySOS}
          accessibilityLabel="Emergency SOS"
          hitSlop={8}
        >
          <Ionicons name="call" size={14} color="#EF4444" style={{ marginRight: 5 }} />
          <Text style={styles.sosBtnText}>SOS</Text>
        </Pressable>
      </View>

      {/* Location Status / Permission Banner (Non-blocking) */}
      {permissionDenied && (
        <View style={styles.gpsWarningBanner}>
          <Ionicons name="warning-outline" size={16} color="#B45309" />
          <Text style={styles.gpsWarningText}>
            Location access off. Showing booking address on map.
          </Text>
          <Pressable style={styles.gpsEnableBtn} onPress={refreshGps}>
            <Text style={styles.gpsEnableBtnText}>Enable</Text>
          </Pressable>
        </View>
      )}

      {!gpsEnabled && !permissionDenied && (
        <View style={styles.gpsWarningBanner}>
          <Ionicons name="location-outline" size={16} color="#B45309" />
          <Text style={styles.gpsWarningText}>Device GPS is turned off.</Text>
          <Pressable style={styles.gpsEnableBtn} onPress={refreshGps}>
            <Text style={styles.gpsEnableBtnText}>Refresh</Text>
          </Pressable>
        </View>
      )}

      {isMapExpanded ? (
        <View style={styles.mapContainerExpanded}>
          <GoogleMapTracker
            ref={mapRef}
            destLat={destLat}
            destLng={destLng}
            destAddress={customerAddress}
            customerGpsLat={customerGps?.latitude}
            customerGpsLng={customerGps?.longitude}
            partnerLat={partnerPos?.lat}
            partnerLng={partnerPos?.lng}
            hasPartnerLocation={hasPartnerLocation}
            isLiveConnected={isLiveConnected}
            isGpsStale={isGpsStale}
            partnerBearing={partnerPos?.bearing ?? 0}
            partnerName={booking?.workerName || 'Service Partner'}
            serviceCategory={booking?.serviceName}
            routeCoordinates={routeCoordinates}
            fitPadding={mapFitPadding}
            lastUpdateTimestamp={lastUpdateTimestamp}
            status={booking?.status || 'SEARCHING'}
            etaText={etaText}
            distanceText={distanceText}
            showControls={false}
            showEtaBadge={false}
            style={StyleSheet.absoluteFill}
          />

          {hasPartnerLocation && etaSeconds !== null ? (
            <View style={styles.floatingEtaChip}>
              <View style={styles.etaGreenDot} />
              <Text style={styles.floatingEtaText}>
                {`Arriving in ${etaText}`}
                {distanceText && distanceText !== 'Unavailable' ? ` • ${distanceText}` : ''}
              </Text>
            </View>
          ) : null}

          {destinationMissing || routeNotice || trackingError ? (
            <View style={styles.routeNoticeBanner} accessibilityLiveRegion="polite">
              <Ionicons name="information-circle-outline" size={14} color="#92400E" />
              <Text style={styles.routeNoticeText} numberOfLines={3}>
                {destinationMissing
                  ? "This booking's service address has no map location, so no route can be shown."
                  : routeNotice || trackingError}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.floatingRecenterBtn, { bottom: Math.max(insets.bottom, 12) + 84 }]}
            onPress={() => mapRef.current?.fitRouteBounds()}
            accessibilityLabel="Recenter map overview"
          >
            <Ionicons name="scan-outline" size={18} color="#1E293B" />
          </Pressable>

          <View style={[styles.compactFloatingBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.compactPartnerInfo}>
              <Text style={styles.compactPartnerName} numberOfLines={1}>
                {booking?.workerName || 'Service Partner'}
              </Text>
              <Text style={styles.compactEtaText}>
                {etaSeconds !== null && etaText
                  ? `ETA: ${etaText}${distanceText && distanceText !== 'Unavailable' ? ` • ${distanceText}` : ''}`
                  : routeNotice || statusSummary.desc}
              </Text>
            </View>
            <Pressable
              style={styles.compactExpandBtn}
              onPress={() => {
                setIsMapExpanded(false);
                setTimeout(() => mapRef.current?.fitRouteBounds(), 150);
              }}
            >
              <Ionicons name="contract-outline" size={16} color="#FFFFFF" />
              <Text style={styles.compactExpandBtnText}>Details</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Map Card */}
          <View style={styles.mapCard}>
            <GoogleMapTracker
              ref={mapRef}
              destLat={destLat}
              destLng={destLng}
              destAddress={customerAddress}
              customerGpsLat={customerGps?.latitude}
              customerGpsLng={customerGps?.longitude}
              partnerLat={partnerPos?.lat}
              partnerLng={partnerPos?.lng}
              hasPartnerLocation={hasPartnerLocation}
              isLiveConnected={isLiveConnected}
              isGpsStale={isGpsStale}
              partnerBearing={partnerPos?.bearing ?? 0}
              partnerName={booking?.workerName || 'Service Partner'}
              serviceCategory={booking?.serviceName}
              routeCoordinates={routeCoordinates}
              fitPadding={{
                ...mapFitPadding,
                bottom: Math.max(mapFitPadding.bottom, 92),
              }}
              lastUpdateTimestamp={lastUpdateTimestamp}
              status={booking?.status || 'SEARCHING'}
              etaText={etaText}
              distanceText={distanceText}
              showControls={false}
              showEtaBadge={false}
              style={StyleSheet.absoluteFill}
            />

            {destinationMissing || routeNotice || trackingError ? (
              <View style={[styles.routeNoticeBanner, { top: 12 }]} accessibilityLiveRegion="polite">
                <Ionicons name="information-circle-outline" size={14} color="#92400E" />
                <Text style={styles.routeNoticeText} numberOfLines={3}>
                  {destinationMissing
                    ? "This booking's service address has no map location, so no route can be shown."
                    : routeNotice || trackingError}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.floatingExpandMapBtn, { bottom: 132 }]}
              onPress={() => {
                setIsMapExpanded(true);
                setTimeout(() => mapRef.current?.fitRouteBounds(), 150);
              }}
              accessibilityLabel="Expand map full screen"
            >
              <Ionicons name="expand-outline" size={18} color="#1E293B" />
            </Pressable>

            <Pressable
              style={[styles.floatingRecenterBtn, { bottom: 84 }]}
              onPress={() => mapRef.current?.fitRouteBounds()}
              accessibilityLabel="Recenter map overview"
            >
              <Ionicons name="scan-outline" size={18} color="#1E293B" />
            </Pressable>

            {/* Docked Dark Blue Route Info Bar */}
            <View style={styles.dockedRouteInfoBar}>
              {/* Arrival Time */}
              <View style={styles.routeInfoSide}>
                <Ionicons name="time-outline" size={26} color="#FFFFFF" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.routeInfoLabel}>Arrival Time</Text>
                  <Text style={styles.routeInfoValue}>
                    {etaSeconds !== null && etaText
                      ? etaText
                      : booking?.status === 'ON_THE_WAY'
                        ? !hasPartnerLocation
                          ? 'Pending GPS'
                          : 'Unavailable'
                        : 'Standby'}
                  </Text>
                </View>
              </View>

              {/* Vertical Divider */}
              <View style={styles.routeInfoDivider} />

              {/* Distance */}
              <View style={styles.routeInfoSide}>
                <Ionicons name="location-sharp" size={26} color="#FFFFFF" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.routeInfoLabel}>Distance</Text>
                  <Text style={styles.routeInfoValue}>
                    {distanceText && distanceText !== 'Unavailable' ? distanceText : '--'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Truthful Live Status Strip */}
          <View style={[styles.statusCard, { marginHorizontal: 16, marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }]}>
            <View style={styles.statusHeaderRow}>
              <View style={[styles.statusIndicatorDot, { backgroundColor: statusSummary.badgeColor }]} />
              <Text style={styles.statusCardTitle}>{statusSummary.title}</Text>
              {hasPartnerLocation && !isGpsStale && isLiveConnected ? (
                <View style={styles.liveIndicatorBadge}>
                  <View style={styles.liveBlinkingDot} />
                  <Text style={styles.liveIndicatorText}>LIVE</Text>
                </View>
              ) : isGpsStale && hasPartnerLocation ? (
                <View style={[styles.liveIndicatorBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                  <Ionicons name="time-outline" size={11} color="#D97706" style={{ marginRight: 3 }} />
                  <Text style={[styles.liveIndicatorText, { color: '#B45309', fontSize: 9.5 }]}>GPS PAUSED</Text>
                </View>
              ) : isLiveConnected && !hasPartnerLocation ? (
                <View style={[styles.liveIndicatorBadge, { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' }]}>
                  <ActivityIndicator size="small" color="#2563EB" style={{ transform: [{ scale: 0.6 }], marginRight: 2 }} />
                  <Text style={[styles.liveIndicatorText, { color: '#1D4ED8', fontSize: 9.5 }]}>UPDATING</Text>
                </View>
              ) : (
                <View style={[styles.liveIndicatorBadge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                  <Ionicons name="time-outline" size={11} color="#64748B" style={{ marginRight: 3 }} />
                  <Text style={[styles.liveIndicatorText, { color: '#475569', fontSize: 9.5 }]}>
                    {booking?.status === 'ACCEPTED' || booking?.status === 'CONFIRMED' ? 'STANDBY' : 'OFFLINE'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.statusCardDesc}>{statusSummary.desc}</Text>
            {hasPartnerLocation && lastUpdateTimestamp ? (
              <Text style={styles.gpsSignalTimestampText}>
                {`Signal received: ${new Date(lastUpdateTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
              </Text>
            ) : null}
          </View>

          {/* If searching with no worker, render radar searching view */}
          {!booking?.workerName && (booking?.status === 'SEARCHING' || booking?.status === 'WORKER_NOT_FOUND') ? (
            <RadarSearchingView
              serviceName={booking?.serviceName || 'Home Service'}
              isNotFound={booking?.status === 'WORKER_NOT_FOUND'}
              onRetry={handleRetrySearch}
              onSchedule={() => router.push('/booking/date-time')}
              onCancel={handleCancelBooking}
              isRetrying={isRetryingSearch}
            />
          ) : (
            <>
              {/* Pending PIN Notice — PIN is revealed ONLY after server confirms ARRIVED */}
              {(booking?.status === 'ACCEPTED' ||
                booking?.status === 'CONFIRMED' ||
                booking?.status === 'ON_THE_WAY') && (
                <View style={[styles.pinPendingCard, { marginHorizontal: 16, marginTop: 12, marginBottom: 0 }]}>
                  <View style={styles.pinPendingIconWrap}>
                    <Ionicons name="lock-closed" size={16} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pinPendingTitle}>Doorstep PIN Security</Text>
                    <Text style={styles.pinPendingText}>
                      Your 4-digit Service Start PIN will appear here once your partner arrives.
                    </Text>
                  </View>
                </View>
              )}

              {/* Partner Profile Card */}
              <View style={styles.partnerCard}>
                <View style={styles.avatarWrap}>
                  {booking?.workerAvatarUrl ? (
                    <Image
                      source={{ uri: booking.workerAvatarUrl }}
                      style={styles.workerAvatarImg}
                    />
                  ) : (
                    <View style={[styles.workerAvatar, { width: 52, height: 52, borderRadius: 26 }]}>
                      <Text style={styles.workerAvatarText}>
                        {(booking?.workerName || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.onlineGreenDot} />
                </View>

                <View style={styles.partnerInfoWrap}>
                  <View style={styles.partnerNameRow}>
                    <Text style={styles.partnerNameText}>{booking?.workerName || 'Service Partner'}</Text>
                    {booking?.workerName ? (
                      <Ionicons name="checkmark-circle" size={17} color="#2563EB" style={{ marginLeft: 5 }} />
                    ) : null}
                  </View>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={styles.ratingNumber}>
                      {booking?.workerRating != null ? booking.workerRating.toFixed(1) : 'New partner'}
                    </Text>
                  </View>
                  <Text style={styles.partnerRoleText}>
                    {booking?.serviceName ? `${booking.serviceName} Specialist` : 'Service Specialist'}
                  </Text>
                </View>

                <View style={styles.actionsGroup}>
                  <Pressable
                    style={[styles.actionBtnCircle, styles.callBtnCircle, !booking?.workerPhone && { opacity: 0.5 }]}
                    onPress={handleCall}
                    accessibilityLabel="Call partner"
                  >
                    <Ionicons name="call" size={20} color="#2563EB" />
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtnCircle, styles.chatBtnCircle]}
                    onPress={handleChat}
                    accessibilityLabel="Chat with partner"
                  >
                    <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>

              {/* Cancel Booking Button */}
              <Pressable
                style={styles.cancelBookingBtn}
                onPress={handleCancelBooking}
                accessibilityRole="button"
                accessibilityLabel="Cancel Booking"
              >
                <Ionicons name="close-circle-outline" size={22} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.cancelBookingText}>Cancel Booking</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}

      {/* Completion Rating Modal (Phase 4) */}
      <RatingModal
        visible={isRatingModalVisible}
        bookingId={id || ''}
        workerName={booking?.workerName}
        serviceName={booking?.serviceName}
        onClose={() => setIsRatingModalVisible(false)}
        onSubmitSuccess={() => {
          Alert.alert('Review Submitted', 'Thank you for rating your service experience!');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 10,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#0F172A',
  },
  headerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  sosBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: '#DC2626',
    letterSpacing: 0.5,
  },

  // Main Single Scroll Layout for Live Tracking View
  scrollBody: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Map Card with rounded corners & shadow
  mapCard: {
    marginHorizontal: 16,
    marginTop: 12,
    height: 350,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.md,
  },

  // Docked Dark Blue Route Info Bar attached to the bottom of the map card
  dockedRouteInfoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#1D4ED8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
  },
  routeInfoSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  routeInfoLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  routeInfoValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: '#FFFFFF',
    marginTop: 1,
  },
  routeInfoDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 8,
  },

  // Service PIN Card
  servicePinCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#F0F6FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 16,
    ...Shadows.sm,
  },
  servicePinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  servicePinTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#0F172A',
  },
  servicePinSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  pinBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 6,
  },
  pinBox: {
    width: (width - 32 - 32 - 36) / 4,
    maxWidth: 72,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  pinBoxDigit: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 26,
    color: '#0F172A',
    fontWeight: '700',
  },

  // Partner Profile Card
  partnerCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    position: 'relative',
    marginRight: 12,
  },
  workerAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
  },
  onlineGreenDot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  partnerInfoWrap: {
    flex: 1,
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerNameText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#0F172A',
  },
  ratingNumber: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#15803D',
  },
  partnerRoleText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnCircle: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  chatBtnCircle: {
    backgroundColor: '#2563EB',
  },

  // Cancel Booking Outlined Red Button
  cancelBookingBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBookingText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#DC2626',
  },

  // GPS Warning Banner
  gpsWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  gpsWarningText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    marginLeft: 6,
  },
  gpsEnableBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#D97706',
    borderRadius: 6,
  },
  gpsEnableBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },

  // Map
  mapContainer: {
    flex: 1.1,
    minHeight: 280,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  mapContainerExpanded: {
    flex: 1,
    minHeight: '100%',
  },
  mapUnavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F8FAFC',
  },
  mapUnavailableText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },

  // Floating ETA Chip
  floatingEtaChip: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    ...Shadows.md,
    zIndex: 20,
  },
  routeNoticeBanner: {
    position: 'absolute',
    top: 56,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(254, 243, 199, 0.96)',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 19,
  },
  routeNoticeText: {
    flex: 1,
    color: '#92400E',
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
  },
  floatingExpandMapBtn: {
    position: 'absolute',
    right: 14,
    bottom: 64,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
    zIndex: 20,
  },
  floatingRecenterBtn: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
    zIndex: 20,
  },
  etaGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  floatingEtaText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  // Compact Floating Bar for Expanded Map View
  compactFloatingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base,
    paddingTop: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    ...Shadows.lg,
    zIndex: 30,
  },
  compactPartnerInfo: {
    flex: 1,
    marginRight: Spacing.base,
  },
  compactPartnerName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#0F172A',
  },
  compactEtaText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
  },
  compactExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  compactExpandBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  },

  // Status Card
  statusCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicatorDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 8,
  },
  statusCardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#0F172A',
    flex: 1,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveBlinkingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 4,
  },
  liveIndicatorText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    color: '#059669',
    letterSpacing: 0.5,
  },
  statusCardDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  gpsSignalTimestampText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Worker Not Found Actions
  workerNotFoundActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  retrySearchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  retrySearchBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  cancelRequestBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelRequestBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#64748B',
  },

  // Bottom Sheet
  bottomSheet: {
    flex: 1,
    maxHeight: '52%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  // Secure Service Start PIN Card (Prominent display when ARRIVED)
  securePinCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    padding: 16,
    marginBottom: 14,
    ...Shadows.sm,
  },
  securePinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  securePinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  securePinBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  copyPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 5,
  },
  copyPinBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11,
    color: '#1D4ED8',
  },
  pinDigitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 8,
  },
  pinDigitBox: {
    width: 48,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  pinDigitText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 26,
    color: '#1E3A8A',
  },
  pinLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  pinLoadingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: '#1D4ED8',
  },
  retryPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 6,
  },
  retryPinText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: '#DC2626',
  },
  pinInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  securePinMessage: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#1E40AF',
    flex: 1,
  },
  securePinHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 3,
    lineHeight: 15,
  },

  // Pin Pending Card (When ACCEPTED or ON_THE_WAY)
  pinPendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
    gap: 12,
  },
  pinPendingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  pinPendingTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: '#0F172A',
  },
  pinPendingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },

  // In Progress Card
  inProgressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginBottom: 14,
    gap: 12,
  },
  inProgressPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  inProgressTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#065F46',
  },
  inProgressSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },

  // Worker Row
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
    borderWidth: 2.5,
    borderColor: '#2563EB',
  },
  workerAvatarText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  onlineBadge: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  workerMeta: {
    flex: 1,
    marginRight: 8,
  },
  workerName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#0F172A',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: '#10B981',
  },
  workerRole: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    backgroundColor: '#10B981',
  },
  chatBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  // Unassigned Card
  unassignedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
  },
  unassignedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  unassignedTextWrap: {
    flex: 1,
  },
  unassignedTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  unassignedDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  refreshSearchBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    marginLeft: 8,
  },
  devSimulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 14,
    gap: 6,
  },
  devSimulateBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: '#7C3AED',
  },

  // Timeline
  timelineContainer: {
    paddingVertical: 4,
    position: 'relative',
  },
  progressLineBg: {
    position: 'absolute',
    top: 15,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  progressLineActive: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepCol: {
    alignItems: 'center',
    width: (width - 48) / 4,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    zIndex: 2,
  },
  stepDotActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  stepDotCurrent: {
    borderColor: '#2563EB',
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
  },
  stepLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#1E293B',
    fontFamily: Typography.fontFamily.bold,
  },
  stepLabelCurrent: {
    color: '#2563EB',
    fontFamily: Typography.fontFamily.bold,
  },

  // Arrived Banner
  arrivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  arrivedBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },

  // Completion Card
  completionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  completionDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  rateNowBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rateNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Terminal and Arrival View Styles
  terminalStateScroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.base,
    paddingBottom: 36,
    paddingTop: 16,
  },
  cancelledHeroWrap: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 16,
  },
  cancelledHeroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cancelledHeroTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 20,
    color: '#991B1B',
    marginBottom: 4,
  },
  cancelledHeroDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#B91C1C',
    textAlign: 'center',
    lineHeight: 18,
  },
  terminalDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...Shadows.sm,
  },
  terminalCardHeader: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  terminalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F8FAFC',
  },
  terminalDetailLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#64748B',
  },
  terminalDetailValue: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: '#0F172A',
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '65%',
  },
  refundNoticeCard: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 20,
    gap: 12,
    alignItems: 'center',
  },
  refundIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundNoticeTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#065F46',
  },
  refundNoticeDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11.5,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  terminalActionsWrap: {
    gap: 10,
    marginTop: 4,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...Shadows.sm,
  },
  primaryActionText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  secondaryActionText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#2563EB',
  },
  textHelpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    marginTop: 4,
  },
  textHelpButtonText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#64748B',
  },
  completedHeroWrap: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 16,
  },
  completedHeroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  completedHeroTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 20,
    color: '#166534',
    marginBottom: 4,
  },
  completedHeroDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#15803D',
    textAlign: 'center',
    lineHeight: 18,
  },
  completedPartnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 12,
    ...Shadows.sm,
  },
  completedPartnerName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#0F172A',
  },
  completedPartnerRole: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  ratePartnerPromptCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratePromptTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#1E3A8A',
  },
  ratePromptSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
    marginBottom: 12,
  },
  openRatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  openRatingButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  arrivedDoorstepHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  arrivedHeroIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivedHeroTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: '#065F46',
  },
  arrivedHeroDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  securePinCardLarge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
    padding: 18,
    marginBottom: 16,
    ...Shadows.sm,
  },
  pinDigitBoxLarge: {
    width: 54,
    height: 62,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  pinDigitTextLarge: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 32,
    color: '#1E3A8A',
  },
  arrivedPartnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...Shadows.sm,
  },
  doorstepChecklistCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  checklistTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkItemText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#475569',
  },
  inProgressHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  inProgressHeroIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inProgressStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  inProgressBlinkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  inProgressStatusTagText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  inProgressHeroTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: '#1E3A8A',
  },
  inProgressHeroDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#1E40AF',
    marginTop: 2,
    lineHeight: 16,
  },
});
