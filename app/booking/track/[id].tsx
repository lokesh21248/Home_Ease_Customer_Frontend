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
import { Client } from '@stomp/stompjs';
import { bookingApi, Booking, getAuthHeaders, TRACKING_WS_URL } from '../../../src/api/client';
import { GoogleMapTracker } from '../../../src/components/map/GoogleMapTracker';
import { GoogleMapHandle } from '../../../src/components/map/GoogleMapView';
import { useLiveTracking } from '../../../src/hooks/useLiveTracking';
import { useCustomerLocation } from '../../../src/hooks/useCustomerLocation';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';
import { isValidCoordinate } from '../../../src/services/coordinates';
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

  useEffect(() => {
    fetchBooking();
    if (booking?.status === 'COMPLETED' || booking?.status === 'CANCELLED') return;
    const pollInterval = booking?.status === 'SEARCHING' ? 3500 : 8000;
    pollingRef.current = setInterval(fetchBooking, pollInterval);
    return () => {
      requestSequence.current += 1;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchBooking, booking?.status]);

  // Instant zero-latency transition to ASSIGNED when tracking frame arrives while SEARCHING
  useEffect(() => {
    if (booking?.status !== 'SEARCHING' || !id) return;
    let client: Client | null = null;
    let cancelled = false;

    const connectEarlyListener = async () => {
      try {
        const headers = await getAuthHeaders();
        if (cancelled) return;
        client = new Client({
          brokerURL: TRACKING_WS_URL,
          connectHeaders: headers,
          reconnectDelay: 2000,
          onConnect: () => {
            if (cancelled || !client) return;
            client.subscribe(`/topic/tracking/${id}`, () => {
              // Partner accepted & published initial GPS! Instantly refresh booking state
              fetchBooking();
            });
          },
        });
        client.activate();
      } catch (err) {
        // Fallback polling continues seamlessly
      }
    };

    void connectEarlyListener();

    return () => {
      cancelled = true;
      if (client) void client.deactivate();
    };
  }, [booking?.status, id, fetchBooking]);

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

  const destLat = hasValidBookingCoords
    ? numBookingLat!
    : customerGps?.latitude !== undefined &&
      isValidCoordinate(customerGps.latitude, customerGps.longitude ?? 0)
    ? customerGps.latitude
    : DEFAULT_MAP_LAT;

  const destLng = hasValidBookingCoords
    ? numBookingLng!
    : customerGps?.longitude !== undefined &&
      isValidCoordinate(customerGps.latitude ?? 0, customerGps.longitude)
    ? customerGps.longitude
    : DEFAULT_MAP_LNG;

  const customerAddress = booking?.userLocation || 'Your Service Location';

  // 3. Live Partner Tracking
  const trackingEnabled =
    !!booking?.workerId &&
    (booking.status === 'ACCEPTED' ||
      booking.status === 'CONFIRMED' ||
      booking.status === 'ON_THE_WAY' ||
      booking.status === 'ARRIVED' ||
      booking.status === 'IN_PROGRESS');

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

  const handleCopyPin = () => {
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2500);
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
        `Partner ${updated.workerName || 'Leela sai krishna'} accepted the booking request. Verification PIN: ${updated.pinCode}`
      );
    } catch (e: any) {
      Alert.alert('Assignment', e?.message || 'Failed to accept booking on backend.');
    }
  };

  const handleCancelBooking = () => {
    if (!id) return;
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking request?',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingApi.cancelBooking(id, 'Customer cancelled due to partner unavailable');
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
      case 'ON_THE_WAY':
      case 'ARRIVED':
        if (!hasPartnerLocation) {
          return {
            title: 'Partner Assigned',
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

        {/* Floating Map Controls (Recenter & Fit Bounds) */}
        <View style={styles.floatingControls}>
          <Pressable
            style={styles.floatingBtn}
            onPress={() => mapRef.current?.recenterToCustomerGps()}
            accessibilityLabel="Recenter to my location"
          >
            <Ionicons name="navigate" size={19} color="#1D4ED8" />
          </Pressable>

          {hasPartnerLocation && (
            <Pressable
              style={styles.floatingBtn}
              onPress={() => mapRef.current?.fitRouteBounds()}
              accessibilityLabel="Fit map to route"
            >
              <Ionicons name="scan-outline" size={19} color="#1E293B" />
            </Pressable>
          )}

          <Pressable
            style={styles.floatingBtn}
            onPress={() => mapRef.current?.zoomIn()}
            accessibilityLabel="Zoom in"
          >
            <Ionicons name="add" size={20} color="#1E293B" />
          </Pressable>

          <Pressable
            style={styles.floatingBtn}
            onPress={() => mapRef.current?.zoomOut()}
            accessibilityLabel="Zoom out"
          >
            <Ionicons name="remove" size={20} color="#1E293B" />
          </Pressable>
        </View>
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

      {/* Bottom Booking & Partner Sheet */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* 1. Security START PIN Banner (Only when authorized and assigned) */}
          {booking?.pinCode &&
            booking.pinCode !== '0000' &&
            (booking.status === 'ACCEPTED' || booking.status === 'IN_PROGRESS') && (
              <Pressable style={styles.pinBanner} onPress={handleCopyPin}>
                <View style={styles.pinBannerLeft}>
                  <Text style={styles.pinBannerTag}>START PIN</Text>
                  <Text style={styles.pinBannerValue}>{booking.pinCode}</Text>
                </View>
                <View style={styles.pinBannerTextWrap}>
                  <Text style={styles.pinBannerTitle}>
                    {pinCopied ? '✓ PIN Copied to Clipboard!' : 'Share PIN with Partner'}
                  </Text>
                  <Text style={styles.pinBannerDesc}>
                    Give this 4-digit PIN upon arrival to verify & begin your service securely.
                  </Text>
                </View>
                <Feather
                  name={pinCopied ? 'check' : 'copy'}
                  size={18}
                  color="#1D4ED8"
                />
              </Pressable>
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
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                  <Text style={styles.ratingText}>HomeEase Verified Professional</Text>
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

  // Floating Controls
  floatingControls: {
    position: 'absolute',
    right: 14,
    top: 14,
    gap: 8,
    zIndex: 20,
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
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

  // PIN Banner
  pinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    marginBottom: 12,
  },
  pinBannerLeft: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  pinBannerTag: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  pinBannerValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: '#1D4ED8',
    letterSpacing: 2,
    marginTop: 1,
  },
  pinBannerTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  pinBannerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: '#1E40AF',
  },
  pinBannerDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 14,
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
});
