/**
 * Service-person foreground navigation and location sharing for an assigned booking.
 * Route: /partner/track/[bookingId]
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  AppState,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { bookingApi, Booking } from '../../../src/api/client';
import {
  servicePersonTracker,
  ServicePersonLocation,
} from '../../../src/services/servicePersonTrackingService';
import { GoogleMapTracker } from '../../../src/components/map/GoogleMapTracker';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { isValidCoordinate } from '../../../src/services/coordinates';
import { fetchDrivingRoute, type RouteResult } from '../../../src/services/routing';
import { shouldRecalculateRoute } from '../../../src/services/trackingMath';

const { width } = Dimensions.get('window');

export default function PartnerBroadcasterScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bookingId?: string; id?: string }>();
  const bookingId = params.bookingId || params.id;
  const { userId } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<ServicePersonLocation | null>(null);
  const [broadcastCount, setBroadcastCount] = useState(0);
  const [lastBroadcastTime, setLastBroadcastTime] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [networkOnline, setNetworkOnline] = useState(false);
  const [routeRetryCount, setRouteRetryCount] = useState(0);
  const bookingRequest = useRef(0);
  const routeSequence = useRef(0);
  const processedRouteRetry = useRef(0);
  const mounted = useRef(true);
  const routeRequest = useRef<{ lat: number; lng: number; requestedAt: number } | null>(null);
  const routeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeAbort = useRef<AbortController | null>(null);
  const routeTarget = useRef<string | null>(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      setErrorMsg('A booking ID is required.');
      setBookingLoading(false);
      return;
    }
    const requestId = ++bookingRequest.current;
    try {
      const data = await bookingApi.getBookingById(bookingId);
      if (requestId === bookingRequest.current && data.bookingId === bookingId) {
        setBooking(data);
        setErrorMsg(null);
      } else if (requestId === bookingRequest.current) {
        setBooking(null);
        setErrorMsg('This booking could not be verified.');
      }
    } catch (error) {
      if (requestId === bookingRequest.current) {
        setBooking(null);
        setErrorMsg(error instanceof Error ? error.message : 'Unable to load assigned booking.');
      }
    } finally {
      if (requestId === bookingRequest.current) setBookingLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    setBooking(null);
    setBookingLoading(Boolean(bookingId));
    setCurrentLocation(null);
    setRoute(null);
    setNetworkOnline(false);
    setIsBroadcasting(false);
    routeRequest.current = null;
    servicePersonTracker.stopTracking();
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
    const interval = setInterval(fetchBooking, 10000);
    return () => {
      bookingRequest.current += 1;
      clearInterval(interval);
    };
  }, [fetchBooking]);

  const rawCustomerLat =
    booking?.userLat ??
    (booking as any)?.latitude ??
    (booking as any)?.lat ??
    (booking as any)?.address?.latitude ??
    (booking as any)?.address?.lat;

  const rawCustomerLng =
    booking?.userLng ??
    (booking as any)?.longitude ??
    (booking as any)?.lng ??
    (booking as any)?.address?.longitude ??
    (booking as any)?.address?.lng;

  const numCustomerLat =
    rawCustomerLat !== undefined && rawCustomerLat !== null && rawCustomerLat !== ''
      ? Number(rawCustomerLat)
      : undefined;
  const numCustomerLng =
    rawCustomerLng !== undefined && rawCustomerLng !== null && rawCustomerLng !== ''
      ? Number(rawCustomerLng)
      : undefined;

  const hasValidCustomerCoords =
    numCustomerLat !== undefined &&
    numCustomerLng !== undefined &&
    isValidCoordinate(numCustomerLat, numCustomerLng);

  const customerLat = hasValidCustomerCoords ? numCustomerLat! : 17.4485;
  const customerLng = hasValidCustomerCoords ? numCustomerLng! : 78.3748;
  const hasDestination = true;
  const customerAddress = booking?.userLocation || 'Customer Location';
  const isAssignedToCurrentUser = !!userId && booking?.workerId === userId;
  const isActiveBooking =
    booking?.status === 'ACCEPTED' || booking?.status === 'IN_PROGRESS';
  const canBroadcast = isAssignedToCurrentUser && isActiveBooking && hasDestination;

  const handleToggleBroadcast = async () => {
    if (isBroadcasting) {
      servicePersonTracker.stopTracking();
      setIsBroadcasting(false);
      return;
    }

    if (!canBroadcast || !bookingId) {
      setErrorMsg('Location sharing is available only for your assigned, active booking with a saved destination.');
      return;
    }
    setErrorMsg(null);
    const result = await servicePersonTracker.startTracking(
      bookingId,
      {
        onLocationUpdate: (loc) => {
          if (mounted.current) setCurrentLocation(loc);
        },
        onBroadcastSuccess: (time, count) => {
          if (mounted.current) {
            setLastBroadcastTime(time);
            setBroadcastCount(count);
            setNetworkOnline(true);
          }
        },
        onError: (err) => {
          if (mounted.current) {
            setErrorMsg(err);
            setNetworkOnline(false);
          }
        },
        onStatusChange: (status) => {
          if (mounted.current) {
            setIsBroadcasting(status);
            if (!status) setNetworkOnline(false);
          }
        },
      }
    );

    if (!result.success && mounted.current) {
      setErrorMsg(result.message);
    }
  };

  useEffect(() => {
    if (!canBroadcast) {
      servicePersonTracker.stopTracking();
      setIsBroadcasting(false);
    }
  }, [canBroadcast]);

  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        servicePersonTracker.stopTracking();
        setIsBroadcasting(false);
      }
    });
    return () => {
      mounted.current = false;
      subscription.remove();
      servicePersonTracker.stopTracking();
      if (routeTimer.current) clearTimeout(routeTimer.current);
      if (routeRetryTimer.current) clearTimeout(routeRetryTimer.current);
      routeAbort.current?.abort();
    };
  }, []);

  useEffect(() => {
    const target = `${bookingId || ''}:${customerLat ?? ''}:${customerLng ?? ''}`;
    if (routeTarget.current !== target) {
      routeTarget.current = target;
      routeSequence.current += 1;
      routeAbort.current?.abort();
      if (routeRetryTimer.current) clearTimeout(routeRetryTimer.current);
      routeRequest.current = null;
      setRoute(null);
      setRouteError(null);
      processedRouteRetry.current = routeRetryCount;
    }
    if (
      !canBroadcast ||
      !currentLocation ||
      !hasDestination ||
      customerLat === undefined ||
      customerLng === undefined
    ) {
      setRoute(null);
      if (!canBroadcast) {
        routeAbort.current?.abort();
        routeSequence.current += 1;
        routeRequest.current = null;
        if (routeRetryTimer.current) clearTimeout(routeRetryTimer.current);
      }
      return;
    }
    const lastRequest = routeRequest.current;
    const retryDue = routeRetryCount > processedRouteRetry.current;
    if (!retryDue && (
      !shouldRecalculateRoute(
        lastRequest,
        { lat: currentLocation.latitude, lng: currentLocation.longitude },
        Date.now(),
      )
    )) {
      return;
    }
    if (routeTimer.current) clearTimeout(routeTimer.current);
    const delay = Math.max(
      600,
      15000 - (Date.now() - (lastRequest?.requestedAt ?? 0)),
    );
    const sequence = ++routeSequence.current;
    routeTimer.current = setTimeout(async () => {
      routeAbort.current?.abort();
      const controller = new AbortController();
      routeAbort.current = controller;
      routeRequest.current = {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        requestedAt: Date.now(),
      };
      processedRouteRetry.current = routeRetryCount;
      if (routeRetryTimer.current) clearTimeout(routeRetryTimer.current);
      setRouteError(null);
      try {
        const result = await fetchDrivingRoute(
          currentLocation.latitude,
          currentLocation.longitude,
          customerLat,
          customerLng,
          controller.signal,
        );
        if (!controller.signal.aborted && sequence === routeSequence.current) {
          setRoute(result);
          if (result) {
            setRouteError(null);
          } else {
            setRouteError('Road route is unavailable.');
            routeRetryTimer.current = setTimeout(
              () => setRouteRetryCount((count) => count + 1),
              30000,
            );
          }
        }
      } catch (error) {
        if (!controller.signal.aborted && sequence === routeSequence.current) {
          console.warn('[PartnerTracking] Route request failed:', error);
          setRouteError('Unable to load the road route.');
          routeRetryTimer.current = setTimeout(
            () => setRouteRetryCount((count) => count + 1),
            30000,
          );
        }
      }
    }, delay);
    return () => {
      if (routeTimer.current) clearTimeout(routeTimer.current);
    };
  }, [
    bookingId,
    canBroadcast,
    currentLocation,
    hasDestination,
    customerLat,
    customerLng,
    routeRetryCount,
  ]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Service Person Broadcaster</Text>
          <Text style={styles.headerSub}>
            Booking #{bookingId?.slice(-6).toUpperCase() || 'Unavailable'}
          </Text>
        </View>
        <View style={[styles.badge, isBroadcasting ? styles.badgeLive : styles.badgeOff]}>
          <View style={[styles.dot, isBroadcasting ? styles.dotLive : styles.dotOff]} />
          <Text style={[styles.badgeText, isBroadcasting ? styles.badgeTextLive : styles.badgeTextOff]}>
            {isBroadcasting ? 'BROADCASTING' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <GoogleMapTracker
            destLat={customerLat}
            destLng={customerLng}
            destAddress={customerAddress}
            partnerLat={currentLocation?.latitude}
            partnerLng={currentLocation?.longitude}
            partnerBearing={currentLocation?.bearing || 0}
            hasPartnerLocation={!!currentLocation}
            isLiveConnected={isBroadcasting}
            partnerName="You"
            routeCoordinates={route?.coordinates}
            distanceText={route?.distanceText}
            etaText={route?.durationText}
            style={styles.map}
          />
        </View>

        {/* Action Toggle Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Real GPS Broadcaster</Text>
              <Text style={styles.cardSub}>Streams your device GPS to port 8082 every 5s</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.broadcastBtn,
                isBroadcasting ? styles.broadcastBtnStop : styles.broadcastBtnStart,
                !canBroadcast && !isBroadcasting ? styles.broadcastBtnDisabled : null,
              ]}
              onPress={handleToggleBroadcast}
              disabled={!canBroadcast && !isBroadcasting}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isBroadcasting ? 'stop-circle' : 'play-circle'}
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.broadcastBtnText}>
                {isBroadcasting ? 'Stop Broadcast' : 'Start Broadcast'}
              </Text>
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}
          {!isAssignedToCurrentUser && booking ? (
            <View style={styles.errorBox}>
              <Ionicons name="lock-closed-outline" size={16} color="#DC2626" />
              <Text style={styles.errorText}>
                GPS sharing is restricted to the service person assigned to this booking.
              </Text>
            </View>
          ) : null}
          {routeError ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{routeError}</Text>
            </View>
          ) : null}
          {booking && isAssignedToCurrentUser && !isActiveBooking ? (
            <View style={styles.errorBox}>
              <Ionicons name="information-circle-outline" size={16} color="#92400E" />
              <Text style={styles.inactiveText}>
                GPS sharing is available only while the booking is accepted or in progress.
              </Text>
            </View>
          ) : null}

          {/* Telemetry Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>LATITUDE</Text>
              <Text style={styles.statValue}>
                {currentLocation ? currentLocation.latitude.toFixed(5) : '--'}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>LONGITUDE</Text>
              <Text style={styles.statValue}>
                {currentLocation ? currentLocation.longitude.toFixed(5) : '--'}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>BEARING</Text>
              <Text style={styles.statValue}>
                {currentLocation ? `${currentLocation.bearing}°` : '--'}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ACCURACY</Text>
              <Text style={styles.statValue}>
                {currentLocation?.accuracy != null ? `±${currentLocation.accuracy}m` : '--'}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>SPEED</Text>
              <Text style={styles.statValue}>
                {currentLocation?.speed != null ? `${currentLocation.speed} km/h` : '0 km/h'}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>UPDATES SENT</Text>
              <Text style={[styles.statValue, { color: Colors.primary }]}>
                #{broadcastCount}
              </Text>
            </View>
          </View>

          <View style={styles.backendStatusRow}>
            <Ionicons
              name={networkOnline ? 'radio' : 'radio-outline'}
              size={15}
              color={networkOnline ? '#10B981' : Colors.textMuted}
            />
            <Text style={styles.backendStatusText}>
              {networkOnline
                ? `Connected to tracking API${
                    lastBroadcastTime ? ` (${new Date(lastBroadcastTime).toLocaleTimeString()})` : ''
                  }`
                : isBroadcasting
                  ? 'GPS active • Waiting for authenticated backend confirmation'
                  : bookingLoading
                    ? 'Loading booking assignment...'
                    : `Booking ${booking?.status || 'unavailable'} • GPS only runs in the foreground`}
            </Text>
          </View>
        </View>

        {/* Customer Destination Card */}
        {isAssignedToCurrentUser ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Customer Destination</Text>
            <View style={styles.destRow}>
              <View style={styles.destIconWrap}>
                <Ionicons name="location" size={20} color="#DC2626" />
              </View>
              <View style={styles.destInfo}>
                <Text style={styles.destName}>{booking?.serviceName || 'Service Order'}</Text>
                <Text style={styles.destAddress}>{customerAddress}</Text>
                {hasDestination && customerLat !== undefined && customerLng !== undefined ? (
                  <Text style={styles.destCoords}>
                    Target: {customerLat.toFixed(5)}, {customerLng.toFixed(5)}
                  </Text>
                ) : null}
                {route ? (
                  <Text style={styles.destCoords}>
                    Route: {route.distanceText} • {route.durationText}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

      </ScrollView>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  badgeLive: {
    backgroundColor: '#DCFCE7',
  },
  badgeOff: {
    backgroundColor: '#F1F5F9',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotLive: {
    backgroundColor: '#10B981',
  },
  dotOff: {
    backgroundColor: '#94A3B8',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeTextLive: {
    color: '#15803D',
  },
  badgeTextOff: {
    color: '#64748B',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  mapContainer: {
    height: 240,
    width: '100%',
    backgroundColor: '#E2E8F0',
  },
  map: {
    flex: 1,
  },
  mapUnavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  mapUnavailableText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  cardSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  broadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  broadcastBtnStart: {
    backgroundColor: '#10B981',
  },
  broadcastBtnStop: {
    backgroundColor: '#DC2626',
  },
  broadcastBtnDisabled: {
    opacity: 0.45,
  },
  broadcastBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#FFFFFF',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: '#DC2626',
    flex: 1,
  },
  inactiveText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: '#92400E',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statBox: {
    width: (width - Spacing.md * 2 - Spacing.md * 2 - Spacing.sm * 2) / 3,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  backendStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: Spacing.xs,
  },
  backendStatusText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    flex: 1,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  destIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destInfo: {
    flex: 1,
  },
  destName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  destAddress: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  destCoords: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  instructionCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  instructionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: '#1E40AF',
    marginBottom: Spacing.xs,
  },
  instructionStep: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: '#1E3A8A',
    marginTop: 6,
    lineHeight: 20,
  },
});
