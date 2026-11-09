import { useCallback, useEffect, useRef, useState } from 'react';
import { Client, ReconnectionTimeMode } from '@stomp/stompjs';
import {
  trackingApi,
  TRACKING_WS_URL,
  getAuthHeaders,
  ApiError,
  type TrackingLocationResponse,
} from '../api/client';
import {
  calculateBearing,
  fetchDrivingRoute,
  formatDistance,
  formatDuration,
  type RouteResult,
} from '../services/routing';
import {
  isAcceptableLocationTimestamp,
  parseLocationTimestamp,
  shouldRecalculateRoute,
} from '../services/trackingMath';
import { isValidCoordinate } from '../services/coordinates';
import { trackingLifecycleManager } from '../services/TrackingLifecycleManager';

export interface PartnerCoordinate {
  lat: number;
  lng: number;
  bearing: number;
}

interface TrackingLocationEvent extends TrackingLocationResponse {
  distanceText?: string;
  etaText?: string;
  distanceKm?: number;
  etaMinutes?: number;
}

interface UseLiveTrackingProps {
  bookingId?: string;
  customerLat?: number;
  customerLng?: number;
  status?: string;
  enabled?: boolean;
  pollIntervalMs?: number;
}

export function useLiveTracking({
  bookingId,
  customerLat,
  customerLng,
  status,
  enabled = true,
  pollIntervalMs = 5000,
}: UseLiveTrackingProps) {
  const [partnerPos, setPartnerPos] = useState<PartnerCoordinate | null>(null);
  const [hasPartnerLocation, setHasPartnerLocation] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'AUTH_ERROR'
  >('DISCONNECTED');
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeRetryCount, setRouteRetryCount] = useState(0);
  const [serverEta, setServerEta] = useState<string | null>(null);
  const [serverDistance, setServerDistance] = useState<string | null>(null);
  const [trackingEnded, setTrackingEnded] = useState(false);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number | null>(null);
  const [isGpsStale, setIsGpsStale] = useState(false);

  const stompClientRef = useRef<Client | null>(null);
  const pollInFlightRef = useRef(false);
  const pollAbortRef = useRef<AbortController | null>(null);
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeAbortRef = useRef<AbortController | null>(null);
  const routeRequestRef = useRef<{ lat: number; lng: number; requestedAt: number } | null>(null);
  const routeRequestIdRef = useRef(0);
  const processedRouteRetryRef = useRef(0);
  const routeTargetRef = useRef<string | null>(null);
  const lastUpdateRef = useRef<number | null>(null);
  const previousPositionRef = useRef<PartnerCoordinate | null>(null);
  const activeBookingIdRef = useRef(bookingId);
  activeBookingIdRef.current = bookingId;
  const isTravelStage = trackingLifecycleManager.isTravelTrackingAuthorized(bookingId, status);
  const terminal =
    status === 'COMPLETED' ||
    status === 'CANCELLED' ||
    status === 'ARRIVED' ||
    status === 'IN_PROGRESS';
  const hasDestination =
    customerLat !== undefined &&
    customerLng !== undefined &&
    isValidCoordinate(customerLat, customerLng);
  const trackingActive = Boolean(
    bookingId && enabled && isTravelStage && !terminal && !trackingEnded,
  );

  const applyLocation = useCallback(
    (payload: TrackingLocationEvent, expectedBookingId: string) => {
      if (expectedBookingId !== activeBookingIdRef.current) return;
      if (payload.bookingId && payload.bookingId !== expectedBookingId) return;
      if (
        payload.status === 'TRACKING_ENDED' ||
        payload.status === 'ARRIVED' ||
        (payload as any).type === 'WORKER_ARRIVED' ||
        (payload as any).type === 'BOOKING_TRACKING_STOPPED' ||
        payload.trackingActive === false
      ) {
        setTrackingEnded(true);
        setIsLiveConnected(false);
        setConnectionStatus('DISCONNECTED');
        pollAbortRef.current?.abort();
        routeAbortRef.current?.abort();
        if (stompClientRef.current) void stompClientRef.current.deactivate();
        return;
      }
      const latitude = payload.latitude ?? payload.lat;
      const longitude = payload.longitude ?? payload.lng;
      if (payload.found === false || !isValidCoordinate(latitude ?? NaN, longitude ?? NaN)) {
        return;
      }

      const rawTimestamp = payload.timestamp ?? payload.updatedAt;
      const parsedTimestamp = parseLocationTimestamp(rawTimestamp);
      if (rawTimestamp !== undefined && parsedTimestamp === null) return;
      const timestamp = parsedTimestamp ?? Date.now();
      if (!isAcceptableLocationTimestamp(timestamp, lastUpdateRef.current)) return;

      const previous = previousPositionRef.current;
      const incomingBearing = payload.heading ?? payload.bearing;
      const bearing =
        typeof incomingBearing === 'number' && Number.isFinite(incomingBearing)
          ? incomingBearing
          : previous
            ? calculateBearing(previous.lat, previous.lng, latitude!, longitude!)
            : 0;
      const nextPosition = { lat: latitude!, lng: longitude!, bearing };

      previousPositionRef.current = nextPosition;
      lastUpdateRef.current = timestamp;
      setPartnerPos(nextPosition);
      setHasPartnerLocation(true);
      setLastUpdateTimestamp(timestamp);
      setIsGpsStale(Date.now() - timestamp > 45_000);
      if (payload.distanceText) setServerDistance(payload.distanceText);
      if (payload.etaText) setServerEta(payload.etaText);
      if (typeof payload.distanceKm === 'number' && Number.isFinite(payload.distanceKm)) {
        setServerDistance(formatDistance(payload.distanceKm * 1000));
      }
      if (typeof payload.etaMinutes === 'number' && Number.isFinite(payload.etaMinutes)) {
        setServerEta(formatDuration(payload.etaMinutes * 60));
      }
    },
    [],
  );

  useEffect(() => {
    setPartnerPos(null);
    setHasPartnerLocation(false);
    setRoute(null);
    setRouteError(null);
    setServerEta(null);
    setServerDistance(null);
    setTrackingEnded(false);
    setLastUpdateTimestamp(null);
    setTrackingError(null);
    lastUpdateRef.current = null;
    previousPositionRef.current = null;
    routeRequestRef.current = null;
  }, [bookingId]);

  // Handle authoritative lifecycle events from TrackingLifecycleManager
  useEffect(() => {
    if (!bookingId) return;
    const unsubscribe = trackingLifecycleManager.subscribe(bookingId, (event) => {
      if (
        event.type === 'WORKER_ARRIVED' ||
        event.type === 'BOOKING_TRACKING_STOPPED' ||
        event.type === 'SERVICE_STARTED' ||
        event.type === 'SERVICE_COMPLETED' ||
        event.type === 'BOOKING_CANCELLED' ||
        event.trackingActive === false
      ) {
        setTrackingEnded(true);
        setIsLiveConnected(false);
        setConnectionStatus('DISCONNECTED');
        pollAbortRef.current?.abort();
        routeAbortRef.current?.abort();
        if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
        if (routeRetryTimerRef.current) clearTimeout(routeRetryTimerRef.current);
        if (stompClientRef.current) void stompClientRef.current.deactivate();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bookingId]);

  // Synchronize component status prop with authoritative lifecycle
  useEffect(() => {
    if (!bookingId) return;
    if (status === 'ARRIVED') {
      trackingLifecycleManager.markArrived(bookingId);
      setTrackingEnded(true);
      setIsLiveConnected(false);
      setConnectionStatus('DISCONNECTED');
      pollAbortRef.current?.abort();
      routeAbortRef.current?.abort();
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
      if (routeRetryTimerRef.current) clearTimeout(routeRetryTimerRef.current);
      if (stompClientRef.current) void stompClientRef.current.deactivate();
    } else if (
      status === 'IN_PROGRESS' ||
      status === 'COMPLETED' ||
      status === 'CANCELLED'
    ) {
      trackingLifecycleManager.stopTracking(bookingId, status);
      setTrackingEnded(true);
      setIsLiveConnected(false);
      setConnectionStatus('DISCONNECTED');
      pollAbortRef.current?.abort();
      routeAbortRef.current?.abort();
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
      if (routeRetryTimerRef.current) clearTimeout(routeRetryTimerRef.current);
      if (stompClientRef.current) void stompClientRef.current.deactivate();
    } else if (
      status === 'ON_THE_WAY' ||
      status === 'ACCEPTED' ||
      status === 'CONFIRMED'
    ) {
      if (trackingLifecycleManager.getState(bookingId) !== 'ARRIVED') {
        setTrackingEnded(false);
      }
    }
  }, [bookingId, status]);

  useEffect(() => {
    if (!trackingActive || !bookingId) {
      setIsGpsStale(false);
      setIsLiveConnected(false);
      setConnectionStatus('DISCONNECTED');
      return;
    }
    const timer = setInterval(() => {
      setIsGpsStale(
        lastUpdateRef.current !== null && Date.now() - lastUpdateRef.current > 45_000,
      );
    }, 5000);
    return () => clearInterval(timer);
  }, [trackingActive, bookingId]);

  useEffect(() => {
    if (!trackingActive || !bookingId) return;
    let cancelled = false;
    let client: Client | null = null;

    const connect = async () => {
      setConnectionStatus('CONNECTING');
      setTrackingError(null);
      const headers = await getAuthHeaders();
      if (cancelled) return;
      if (!headers.Authorization) {
        setConnectionStatus('AUTH_ERROR');
        setTrackingError('Sign in again to view live tracking.');
        return;
      }

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
          setIsLiveConnected(true);
          setConnectionStatus('CONNECTED');
          setTrackingError(null);

          const handleIncoming = (messageBody: string) => {
            try {
              const event: any = JSON.parse(messageBody);
              trackingLifecycleManager.processRemoteEvent(bookingId, event);
              if (
                event.status === 'ARRIVED' ||
                event.type === 'WORKER_ARRIVED' ||
                event.type === 'BOOKING_TRACKING_STOPPED' ||
                event.trackingActive === false
              ) {
                setTrackingEnded(true);
                setIsLiveConnected(false);
                setConnectionStatus('DISCONNECTED');
                pollAbortRef.current?.abort();
                routeAbortRef.current?.abort();
                if (client) void client.deactivate();
                return;
              }
              applyLocation(event, bookingId);
            } catch (error) {
              console.warn('[LiveTracking] Ignored malformed location event:', error);
            }
          };

          client.subscribe(`/topic/tracking/${bookingId}`, (message) => {
            handleIncoming(message.body);
          });

          // Also subscribe to broadcast update stream /topic/tracking/update
          client.subscribe('/topic/tracking/update', (message) => {
            handleIncoming(message.body);
          });
        },
        onDisconnect: () => {
          setIsLiveConnected(false);
          setConnectionStatus('DISCONNECTED');
        },
        onStompError: (frame) => {
          const detail = frame.headers.message || 'Tracking service rejected the connection.';
          setIsLiveConnected(false);
          if (/401|403|unauthori[sz]ed|forbidden|expired/i.test(detail)) {
            setConnectionStatus('AUTH_ERROR');
            setTrackingError('Your session cannot access this booking. Please sign in again.');
            void client?.deactivate();
          } else {
            setConnectionStatus('DISCONNECTED');
            setTrackingError(detail);
          }
        },
        onWebSocketError: () => {
          setIsLiveConnected(false);
          setConnectionStatus('DISCONNECTED');
        },
      });
      stompClientRef.current = client;
      client.activate();
    };

    void connect().catch((error: unknown) => {
      if (!cancelled) {
        console.warn('[LiveTracking] WebSocket connection failed:', error);
        setConnectionStatus('DISCONNECTED');
        setTrackingError('Unable to connect to live tracking. Retrying when the network is available.');
      }
    });

    return () => {
      cancelled = true;
      setIsLiveConnected(false);
      if (stompClientRef.current === client) stompClientRef.current = null;
      if (client) void client.deactivate();
    };
  }, [trackingActive, bookingId, applyLocation]);

  const refreshLocation = useCallback(async () => {
    if (!trackingActive || !bookingId || pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    const controller = new AbortController();
    pollAbortRef.current = controller;
    try {
      const location = await trackingApi.getLatestLocation(bookingId, controller.signal);
      applyLocation(location, bookingId);
      if (
        hasDestination &&
        customerLat !== undefined &&
        customerLng !== undefined
      ) {
        const distance = await trackingApi.getDistanceAndEta(
          bookingId,
          customerLat,
          customerLng,
          controller.signal,
        );
        if (distance.found !== false) {
          const workerLocation = distance.workerLocation;
          if (
            lastUpdateRef.current === null &&
            isValidCoordinate(
              workerLocation?.lat ?? NaN,
              workerLocation?.lng ?? NaN,
            )
          ) {
            applyLocation(
              {
                bookingId,
                latitude: workerLocation?.lat,
                longitude: workerLocation?.lng,
              },
              bookingId,
            );
          }
          if (distance.etaText) setServerEta(distance.etaText);
          else if (distance.etaMinutes !== undefined && Number.isFinite(distance.etaMinutes)) {
            setServerEta(formatDuration(distance.etaMinutes * 60));
          }
          if (distance.distanceText) setServerDistance(distance.distanceText);
          else if (distance.distanceMeters !== undefined && Number.isFinite(distance.distanceMeters)) {
            setServerDistance(formatDistance(distance.distanceMeters));
          } else if (distance.distanceKm !== undefined && Number.isFinite(distance.distanceKm)) {
            setServerDistance(formatDistance(distance.distanceKm * 1000));
          }
        }
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.warn('[LiveTracking] Latest location request failed:', error);
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setConnectionStatus('AUTH_ERROR');
          setTrackingError('Your session cannot access this booking. Please sign in again.');
        }
      }
    } finally {
      if (pollAbortRef.current === controller) {
        pollAbortRef.current = null;
        pollInFlightRef.current = false;
      }
    }
  }, [
    trackingActive,
    bookingId,
    hasDestination,
    customerLat,
    customerLng,
    applyLocation,
  ]);

  useEffect(() => {
    if (!trackingActive) return;
    void refreshLocation();
    const timer = setInterval(() => void refreshLocation(), Math.max(5000, pollIntervalMs));
    return () => {
      clearInterval(timer);
      pollAbortRef.current?.abort();
    };
  }, [trackingActive, refreshLocation, pollIntervalMs]);

  useEffect(() => {
    const targetKey = `${bookingId || ''}:${customerLat ?? ''}:${customerLng ?? ''}`;
    if (routeTargetRef.current !== targetKey) {
      routeTargetRef.current = targetKey;
      routeRequestIdRef.current += 1;
      routeAbortRef.current?.abort();
      if (routeRetryTimerRef.current) clearTimeout(routeRetryTimerRef.current);
      routeRequestRef.current = null;
      processedRouteRetryRef.current = routeRetryCount;
      setRoute(null);
    }

    if (!trackingActive || terminal || !hasDestination || !partnerPos) {
      setRoute(null);
      setRouteLoading(false);
      routeAbortRef.current?.abort();
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
      if (routeRetryTimerRef.current) clearTimeout(routeRetryTimerRef.current);
      routeRequestRef.current = null;
      return;
    }

    const lastRequest = routeRequestRef.current;
    const retryDue = routeRetryCount > processedRouteRetryRef.current;
    if (!retryDue && !shouldRecalculateRoute(lastRequest, partnerPos, Date.now())) return;

    if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
    const lastRequestedAt = routeRequestRef.current?.requestedAt ?? 0;
    const waitMs = Math.max(600, 15_000 - (Date.now() - lastRequestedAt));
    const requestPosition = partnerPos;
    const requestId = ++routeRequestIdRef.current;

    routeTimerRef.current = setTimeout(async () => {
      if (customerLat === undefined || customerLng === undefined) return;
      routeAbortRef.current?.abort();
      const controller = new AbortController();
      routeAbortRef.current = controller;
      routeRequestRef.current = {
        lat: requestPosition.lat,
        lng: requestPosition.lng,
        requestedAt: Date.now(),
      };
      processedRouteRetryRef.current = routeRetryCount;
      if (routeRetryTimerRef.current) clearTimeout(routeRetryTimerRef.current);
      setRouteLoading(true);
      setRouteError(null);
      try {
        const result = await fetchDrivingRoute(
          requestPosition.lat,
          requestPosition.lng,
          customerLat,
          customerLng,
          controller.signal,
        );
        if (
          requestId !== routeRequestIdRef.current ||
          bookingId !== activeBookingIdRef.current ||
          controller.signal.aborted
        ) {
          return;
        }
        setRoute(result);
        if (!result) {
          setRouteError('A road route is not available right now.');
          routeRetryTimerRef.current = setTimeout(
            () => setRouteRetryCount((count) => count + 1),
            30000,
          );
        } else {
          setRouteError(null);
        }
      } catch (error) {
        if (!controller.signal.aborted && requestId === routeRequestIdRef.current) {
          console.warn('[LiveTracking] Route request failed:', error);
          setRouteError('Unable to load the road route. Retrying after the next location update.');
          routeRetryTimerRef.current = setTimeout(
            () => setRouteRetryCount((count) => count + 1),
            30000,
          );
        }
      } finally {
        if (requestId === routeRequestIdRef.current) setRouteLoading(false);
      }
    }, waitMs);

    return () => {
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
    };
  }, [
    bookingId,
    trackingActive,
    terminal,
    hasDestination,
    partnerPos,
    customerLat,
    customerLng,
    routeRetryCount,
  ]);

  useEffect(
    () => () => {
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
      if (routeRetryTimerRef.current) clearTimeout(routeRetryTimerRef.current);
      routeAbortRef.current?.abort();
      pollAbortRef.current?.abort();
      if (stompClientRef.current) void stompClientRef.current.deactivate();
    },
    [],
  );

  let distanceText = '';
  let etaText = '';

  if (status === 'COMPLETED') {
    distanceText = 'Arrived at destination';
    etaText = 'Service completed';
  } else if (status === 'CANCELLED') {
    distanceText = 'Booking cancelled';
    etaText = 'Cancelled';
  } else if (status === 'ARRIVED') {
    distanceText = 'Partner arrived';
    etaText = 'At your doorstep';
  } else if (status === 'IN_PROGRESS') {
    distanceText = 'Partner on site';
    etaText = 'Service in progress';
  } else if (status === 'ACCEPTED' || status === 'ON_THE_WAY' || status === 'CONFIRMED') {
    if (!hasPartnerLocation || !partnerPos) {
      distanceText = 'Awaiting service-person location';
      etaText = 'ETA unavailable';
    } else if (isGpsStale) {
      distanceText = 'Location update is stale';
      etaText = 'Updating...';
    } else {
      distanceText =
        serverDistance ||
        (route ? `${formatDistance(route.distanceMeters)} away` : 'Calculating route...');
      etaText = serverEta || (route ? formatDuration(route.durationSeconds) : 'Calculating ETA...');
    }
  }

  const sendCoordinate = useCallback((lat: number, lng: number): boolean => {
    if (stompClientRef.current?.connected && bookingId) {
      return trackingApi.publishStompCoordinate(stompClientRef.current, bookingId, lat, lng);
    }
    return false;
  }, [bookingId]);

  return {
    partnerPos,
    hasPartnerLocation,
    isLiveConnected,
    connectionStatus,
    trackingError,
    routeCoordinates: route?.coordinates || [],
    routeLoading,
    routeError,
    distanceText,
    etaText,
    isGpsStale,
    lastUpdateTimestamp,
    trackingEnded,
    refreshLocation,
    sendCoordinate,
  };
}
