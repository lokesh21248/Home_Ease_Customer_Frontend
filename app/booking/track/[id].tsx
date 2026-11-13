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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Client, ReconnectionTimeMode } from '@stomp/stompjs';
import { bookingApi, Booking, getAuthHeaders, TRACKING_WS_URL } from '../../../src/api/client';
import { GoogleMapTracker } from '../../../src/components/map/GoogleMapTracker';
import { GoogleMapHandle } from '../../../src/components/map/GoogleMapView';
import { useLiveTracking } from '../../../src/hooks/useLiveTracking';
import { useCustomerLocation } from '../../../src/hooks/useCustomerLocation';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';
import { isValidCoordinate } from '../../../src/services/coordinates';
import { getCentroidForPincode } from '../../../src/services/locationService';
import { RatingModal, RadarSearchingView } from '../../../src/components/common';

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

  // Real-time listener for booking lifecycle events (ASSIGNED, ARRIVED, IN_PROGRESS, COMPLETED)
  useEffect(() => {
    if (!id || booking?.status === 'COMPLETED' || booking?.status === 'CANCELLED') return;
    let client: Client | null = null;
    let cancelled = false;

    const connectLifecycleListener = async () => {
      try {
        const headers = await getAuthHeaders();
        if (cancelled) return;
        client = new Client({
          brokerURL: TRACKING_WS_URL,
          connectHeaders: headers,
          reconnectDelay: 1000,
          reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
          maxReconnectDelay: 30000,
          heartbeatIncoming: 10000,
          heartbeatOutgoing: 10000,
          onConnect: () => {
            if (cancelled || !client) return;

            const handleStatusEvent = (bodyStr: string) => {
              try {
                const event = JSON.parse(bodyStr);
                const eventStatus = event.status || event.type;
                if (eventStatus === 'ARRIVED' || eventStatus === 'WORKER_ARRIVED') {
                  void fetchServicePin();
                } else if (eventStatus === 'IN_PROGRESS' || eventStatus === 'SERVICE_STARTED') {
                  setServicePin(null);
                }
              } catch (_) {}
              void fetchBooking();
            };

            // 1. Partner live GPS & status tracking topic
            client.subscribe(`/topic/tracking/${id}`, (message) => {
              handleStatusEvent(message.body);
            });

            // 2. Booking execution topic
            client.subscribe(`/topic/track/${id}`, (message) => {
              handleStatusEvent(message.body);
            });

            // 3. General booking events topic
            client.subscribe(`/topic/booking/${id}`, (message) => {
              handleStatusEvent(message.body);
            });
          },
        });
        client.activate();
      } catch (err) {
        // Fallback polling continues seamlessly
      }
    };

    void connectLifecycleListener();

    return () => {
      cancelled = true;
      if (client) void client.deactivate();
    };
  }, [id, booking?.status, fetchBooking, fetchServicePin]);

  useEffect(() => {
    setBooking(null);
    setBookingError(null);
  }, [id]);

  // Destination coordinates from booking address or fallback to live GPS or default city center
  const DEFAULT_MAP_LAT = 17.4485;
  const DEFAULT_MAP_LNG = 78.3748;

  const rawBookingLat =
    booking?.userLat ??
    (booking as any)?.latitude ??
    (booking as any)?.lat ??
    (booking as any)?.address?.latitude ??
    (booking as any)?.address?.lat;

  const rawBookingLng =
    booking?.userLng ??
    (booking as any)?.longitude ??
    (booking as any)?.lng ??
    (booking as any)?.address?.longitude ??
    (booking as any)?.address?.lng;

  const numBookingLat =
    rawBookingLat !== undefined && rawBookingLat !== null && rawBookingLat !== ''
      ? Number(rawBookingLat)
      : undefined;
  const numBookingLng =
    rawBookingLng !== undefined && rawBookingLng !== null && rawBookingLng !== ''
      ? Number(rawBookingLng)
      : undefined;

  const hasValidBookingCoords =
    numBookingLat !== undefined &&
    numBookingLng !== undefined &&
    isValidCoordinate(numBookingLat, numBookingLng);

  const bookingPin = (booking as any)?.servicePincode || (booking as any)?.pincode;
  const pinCentroid = bookingPin ? getCentroidForPincode(bookingPin) : null;

  // Safeguard: If booking is for 500010 (Alwal/Bolarum) but carries old stale KPHB coordinates (17.4947, 78.3996),
  // correct to genuine Alwal centroid coordinates so the tracking map never displays KPHB.
  const isStaleKphbCoord =
    numBookingLat !== undefined &&
    numBookingLng !== undefined &&
    Math.abs(numBookingLat - 17.4947) < 0.005 &&
    Math.abs(numBookingLng - 78.3996) < 0.005;

  const destLat =
    isStaleKphbCoord && pinCentroid && (bookingPin?.includes('500010') || bookingPin === '500010')
      ? pinCentroid.latitude
      : hasValidBookingCoords
    ? numBookingLat!
    : pinCentroid?.latitude ??
    (customerGps?.latitude !== undefined && isValidCoordinate(customerGps.latitude, customerGps.longitude ?? 0)
      ? customerGps.latitude
      : DEFAULT_MAP_LAT);

  const destLng =
    isStaleKphbCoord && pinCentroid && (bookingPin?.includes('500010') || bookingPin === '500010')
      ? pinCentroid.longitude
      : hasValidBookingCoords
        ? numBookingLng!
        : pinCentroid?.longitude ??
        (customerGps?.longitude !== undefined && isValidCoordinate(customerGps.latitude ?? 0, customerGps.longitude)
          ? customerGps.longitude
          : DEFAULT_MAP_LNG);

  const customerAddress =
    (booking as any)?.customerAddress ||
    booking?.userLocation ||
    (bookingPin ? `Service Address — ${bookingPin}` : undefined) ||
    'Your Service Location';

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
    connectionStatus,
    trackingError,
    isGpsStale,
    routeCoordinates,
    routeLoading,
    routeError,
    distanceText,
    etaText,
    trackingEnded,
    lastUpdateTimestamp,
  } = useLiveTracking({
    bookingId: id,
    customerLat: destLat,
    customerLng: destLng,
    status: booking?.status,
    enabled: trackingEnabled,
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

  const handleEmergencySOS = () => {
    Alert.alert(
      'Emergency SOS & Safety Hotline',
      'Need urgent help? Connect immediately with HomeEase 24/7 Safety Support or local emergency services.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Safety Support',
          style: 'destructive',
          onPress: () => Linking.openURL('tel:1800123456'),
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
            try {
              await bookingApi.cancelBooking(id, 'Customer cancelled request from tracking screen');
              await fetchBooking();
            } catch (err: any) {
              Alert.alert('Cancellation Error', err?.message || 'Could not cancel booking.');
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
          desc: etaText ? `Arriving in approximately ${etaText}` : 'Live tracking active',
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
  }, [booking, bookingError, hasPartnerLocation, isGpsStale, etaText]);

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
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {booking?.serviceName ? `${booking.serviceName} • ` : 'HomeEase Service • '}
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

      {/* Map Viewport Area */}
      <View style={styles.mapContainer}>
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
          routeCoordinates={routeCoordinates}
          status={booking?.status || 'SEARCHING'}
          etaText={etaText}
          distanceText={distanceText}
          showControls={false}
          showEtaBadge={false}
          style={StyleSheet.absoluteFill}
        />

        {/* Floating ETA & Distance Chip (Shown ONLY when partner location exists) */}
        {hasPartnerLocation && (etaText || distanceText) ? (
          <View style={styles.floatingEtaChip}>
            <View style={styles.etaGreenDot} />
            <Text style={styles.floatingEtaText}>
              {etaText ? `Arriving in ${etaText}` : ''}
              {etaText && distanceText ? ' • ' : ''}
              {distanceText || ''}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Live Status Pill */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeaderRow}>
          <View style={[styles.statusIndicatorDot, { backgroundColor: statusSummary.badgeColor }]} />
          <Text style={styles.statusCardTitle}>{statusSummary.title}</Text>
          {isLiveConnected && (
            <View style={styles.liveIndicatorBadge}>
              <View style={styles.liveBlinkingDot} />
              <Text style={styles.liveIndicatorText}>LIVE</Text>
            </View>
          )}
        </View>
        <Text style={styles.statusCardDesc}>{statusSummary.desc}</Text>

        {/* WORKER_NOT_FOUND Action Buttons */}
        {booking?.status === 'WORKER_NOT_FOUND' && (
          <View style={styles.workerNotFoundActions}>
            <Pressable
              style={styles.retrySearchBtn}
              onPress={handleRetrySearch}
              disabled={isRetryingSearch}
            >
              {isRetryingSearch ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh" size={15} color="#FFFFFF" />
                  <Text style={styles.retrySearchBtnText}>Retry Matching</Text>
                </>
              )}
            </Pressable>
            <Pressable style={styles.cancelRequestBtn} onPress={handleCancelBooking}>
              <Text style={styles.cancelRequestBtnText}>Cancel Booking</Text>
            </Pressable>
          </View>
        )}
      </View>

      {booking?.status === 'ARRIVED' && (
        <View style={styles.arrivedBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.arrivedBannerText}>Partner Has Arrived! Share your PIN to begin.</Text>
        </View>
      )}

      {/* Bottom Booking & Partner Sheet */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* 1. Dedicated Service Start PIN Card (Displayed ONLY when ARRIVED) */}
          {booking?.status === 'ARRIVED' && (
            <View style={styles.securePinCard}>
              <View style={styles.securePinHeader}>
                <View style={styles.securePinBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#1D4ED8" />
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
                  {(servicePin || (booking.pinCode && booking.pinCode !== '****' && booking.pinCode !== '0000' ? booking.pinCode : '----'))
                    .slice(0, 4)
                    .split('')
                    .map((digit, idx) => (
                      <View key={idx} style={styles.pinDigitBox}>
                        <Text style={styles.pinDigitText}>{digit}</Text>
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
                  Share this PIN with your service partner to start the service.
                </Text>
              </View>
              <Text style={styles.securePinHint}>
                Your service partner will enter this 4-digit code on their device to begin work.
              </Text>
            </View>
          )}

          {/* Pending PIN Notice — When Assigned / Travelling (PIN hidden for security) */}
          {(booking?.status === 'ACCEPTED' ||
            booking?.status === 'CONFIRMED' ||
            booking?.status === 'ON_THE_WAY') && (
            <View style={styles.pinPendingCard}>
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

          {/* In Progress Notice */}
          {booking?.status === 'IN_PROGRESS' && (
            <View style={styles.inProgressCard}>
              <View style={styles.inProgressPulse} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inProgressTitle}>Service In Progress</Text>
                <Text style={styles.inProgressSub}>
                  Doorstep PIN verified. Your partner is currently completing your service.
                </Text>
              </View>
            </View>
          )}

          {/* 2. Partner Info Card (Only when assigned) */}
          {booking?.workerName ? (
            <View style={styles.workerRow}>
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
                    {booking.workerRating != null ? booking.workerRating.toFixed(1) : '5.0'}  Verified Pro
                  </Text>
                </View>
                <Text style={styles.workerRole}>
                  {booking.serviceName ? `${booking.serviceName} Specialist` : 'Service Partner'}
                </Text>
              </View>

              {/* Action Buttons: Call & Chat */}
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
                  accessibilityLabel="Chat with support"
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color="#1D4ED8" />
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <RadarSearchingView
                serviceName={booking?.serviceName || 'Home Service'}
                isNotFound={booking?.status === 'WORKER_NOT_FOUND'}
                onRetry={handleRetrySearch}
                onSchedule={() => router.push('/booking/date-time')}
                onCancel={handleCancelBooking}
                isRetrying={isRetryingSearch}
              />

              {__DEV__ && (booking?.status === 'SEARCHING' || booking?.status === 'WORKER_NOT_FOUND') && (
                <Pressable
                  style={styles.devSimulateBtn}
                  onPress={handleSimulateAssignment}
                >
                  <Ionicons name="flash-outline" size={14} color="#7C3AED" />
                  <Text style={styles.devSimulateBtnText}>
                    Test Assignment (Partner Accept via Backend)
                  </Text>
                </Pressable>
              )}
            </>
          )}

          {booking?.status === 'COMPLETED' && (
            <View style={styles.completionCard}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.completionTitle}>Service Completed Successfully</Text>
                <Text style={styles.completionDesc}>Thank you for using HomeEase. How was your experience?</Text>
              </View>
              <Pressable onPress={() => setIsRatingModalVisible(true)} style={styles.rateNowBtn}>
                <Text style={styles.rateNowBtnText}>Rate</Text>
              </Pressable>
            </View>
          )}

          {/* 3. Horizontal Booking Timeline */}
          <View style={styles.timelineContainer}>
            <View style={styles.progressLineBg}>
              <View
                style={[
                  styles.progressLineActive,
                  { width: `${(activeStepIdx / (TRACKING_STEPS.length - 1)) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.stepsRow}>
              {TRACKING_STEPS.map((step, index) => {
                const isPassed = index <= activeStepIdx;
                const isCurrent = index === activeStepIdx;
                return (
                  <View key={step.key} style={styles.stepCol}>
                    <View
                      style={[
                        styles.stepDot,
                        isPassed && styles.stepDotActive,
                        isCurrent && styles.stepDotCurrent,
                      ]}
                    >
                      {isPassed && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        isPassed && styles.stepLabelActive,
                        isCurrent && styles.stepLabelCurrent,
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>

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
    backgroundColor: '#FFFFFF',
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
});
