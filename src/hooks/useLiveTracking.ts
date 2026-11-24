import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Client, ReconnectionTimeMode, type StompSubscription } from '@stomp/stompjs';
import {
  trackingApi,
  TRACKING_WS_URL,
  getAuthHeaders,
  ApiError,
  type TrackingLocationResponse,
  type TrackingSnapshot,
} from '../api/client';
import {
  RouteRequestError,
  calculateBearing,
  fetchBookingRoute,
  formatDistance,
  formatDuration,
  type BookingRoute,
} from '../services/routing';
import {
  isAcceptableLocationTimestamp,
  isLocationStale,
  isSensibleGpsJump,
  parseLocationTimestamp,
} from '../services/trackingMath';
import { isValidCoordinate, type LatLngCoordinate } from '../services/coordinates';
import { computeRemaining, projectOntoRoute, sliceRemainingRoute } from '../services/routeGeometry';
import {
  ROUTE_POLICY,
  backoffMs,
  classifyRouteFailure,
  decideRouteFetch,
  initialRoutePolicyState,
  nextOffRouteStrikes,
  type RouteFailure,
  type RouteFetchReason,
} from '../services/routePolicy';
import { trackingLifecycleManager } from '../services/TrackingLifecycleManager';

export interface PartnerCoordinate {
  lat: number;
  lng: number;
  bearing: number;
}

type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'AUTH_ERROR';

interface UseLiveTrackingProps {
  bookingId?: string;
  status?: string;
  /** Booking has an assigned worker and is in a travel status. */
  enabled?: boolean;
  /** HTTP fallback poll interval, used ONLY while the WebSocket is disconnected. */
  pollIntervalMs?: number;
  /**
   * Called for booking lifecycle events (accepted / arrived / started / completed / cancelled) received on the
   * single shared socket. Location frames are not forwarded.
   */
  onBookingEvent?: (event: Record<string, unknown>) => void;
}

/** Same live window as the server (homeease.tracking.live-window-seconds). */
const GPS_STALE_MS = 30_000;
const SNAPSHOT_POLL_MS = 20_000;
const isFinalStatus = (s?: string) => s === 'COMPLETED' || s === 'CANCELLED';
const isTerminalForTravel = (s?: string) =>
  s === 'COMPLETED' || s === 'CANCELLED' || s === 'ARRIVED' || s === 'IN_PROGRESS';

export function useLiveTracking({
  bookingId,
  status,
  enabled = true,
  pollIntervalMs = 7_000,
  onBookingEvent,
}: UseLiveTrackingProps) {
  const [partnerPos, setPartnerPos] = useState<PartnerCoordinate | null>(null);
  const [hasPartnerLocation, setHasPartnerLocation] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [route, setRoute] = useState<BookingRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeFailure, setRouteFailure] = useState<RouteFailure | null>(null);
  const [trackingEnded, setTrackingEnded] = useState(false);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number | null>(null);
  const [isGpsStale, setIsGpsStale] = useState(false);
  /** Server-side tracking phase + partner device state (why there may be no location). */
  const [serverSnapshot, setServerSnapshot] = useState<TrackingSnapshot | null>(null);
  // Wall clock for display-only derivations (route age). Updated by the 5 s staleness timer, never in render.
  const [nowMs, setNowMs] = useState(() => Date.now());

  // ── refs: always-current values for callbacks that must not re-subscribe on every render ──
  const activeBookingIdRef = useRef(bookingId);
  activeBookingIdRef.current = bookingId;
  const onBookingEventRef = useRef(onBookingEvent);
  onBookingEventRef.current = onBookingEvent;

  const clientRef = useRef<Client | null>(null);
  const trackingSubRef = useRef<StompSubscription[]>([]);
  const bookingSubRef = useRef<StompSubscription[]>([]);

  const partnerRef = useRef<PartnerCoordinate | null>(null);
  const routeRef = useRef<BookingRoute | null>(null);
  /** Partner-device timestamp of the last accepted frame: ORDERING only (compared with the partner's own clock). */
  const lastUpdateRef = useRef<number | null>(null);
  /** This phone's clock when the last accepted frame ARRIVED: freshness / "updated X s ago" (immune to clock skew). */
  const lastReceivedRef = useRef<number | null>(null);
  /** Server-assigned monotonic sequence counter: discards out-of-order packets. */
  const lastSequenceRef = useRef<number | null>(null);
  /** Segment index along the route for EatClub-style progressive route shortening without jumps. */
  const lastSegmentIndexRef = useRef<number>(0);
  /** Timestamp of the last location message received over WebSocket. */
  const lastSocketLocationAtRef = useRef<number | null>(null);

  const policyRef = useRef(initialRoutePolicyState());
  const failuresRef = useRef(0);
  const routeSeqRef = useRef(0);
  const routeAbortRef = useRef<AbortController | null>(null);

  const pollInFlightRef = useRef(false);
  const pollAbortRef = useRef<AbortController | null>(null);
  const authBlockedRef = useRef(false);
  // Latest-callback holders (synced in effects below) so the long-lived socket never captures stale closures.
  const handleFrameRef = useRef<(body: string, id: string) => void>(() => {});
  const refreshLocationRef = useRef<() => Promise<void>>(async () => {});

  const isTravelStage = trackingLifecycleManager.isTravelTrackingAuthorized(bookingId, status);
  const trackingActive = Boolean(
    bookingId && enabled && isTravelStage && !isTerminalForTravel(status) && !trackingEnded,
  );
  const trackingActiveRef = useRef(trackingActive);
  trackingActiveRef.current = trackingActive;
  const socketWanted = Boolean(bookingId) && !isFinalStatus(status);

  // ───────────────────────── route (policy-driven, stale-safe) ─────────────────────────

  const cancelRouteWork = useCallback(() => {
    routeSeqRef.current += 1; // invalidates any response still in flight
    routeAbortRef.current?.abort();
    routeAbortRef.current = null;
    setRouteLoading(false);
  }, []);

  const runRouteFetch = useCallback(async (id: string, reason: RouteFetchReason) => {
    const policy = policyRef.current;
    policy.inFlight = true;
    policy.lastAttemptAt = Date.now();
    routeAbortRef.current?.abort();
    const controller = new AbortController();
    routeAbortRef.current = controller;
    const seq = ++routeSeqRef.current;
    setRouteLoading(true);

    // A response is only applied if nothing newer started and the booking/policy has not been reset.
    const isCurrent = () =>
      seq === routeSeqRef.current &&
      policy === policyRef.current &&
      id === activeBookingIdRef.current &&
      !controller.signal.aborted;

    try {
      const result = await fetchBookingRoute(id, reason, controller.signal);
      if (!isCurrent()) return;
      routeRef.current = result;
      setRoute(result);
      setRouteFailure(null);
      failuresRef.current = 0;
      policy.hasRoute = true;
      policy.lastSuccessAt = Date.now();
      policy.retryNotBefore = null;
      policy.offRouteStrikes = 0;
    } catch (error) {
      if (!isCurrent()) return;
      const failure =
        error instanceof RouteRequestError ? error.failure : classifyRouteFailure({ network: true });
      failuresRef.current += 1;
      setRouteFailure(failure);
      if (failure.fatal) {
        policy.fatal = true;
      } else {
        const wait = backoffMs(failuresRef.current, failure.retryAfterSeconds);
        policy.retryNotBefore =
          Date.now() + (failure.slowRetry ? Math.max(ROUTE_POLICY.SLOW_RETRY_MS, wait) : wait);
      }
    } finally {
      if (policy === policyRef.current && seq === routeSeqRef.current) {
        policy.inFlight = false;
        setRouteLoading(false);
      }
    }
  }, []);

  const evaluateRoute = useCallback(() => {
    const id = activeBookingIdRef.current;
    if (!id || !trackingActiveRef.current || !partnerRef.current) return;
    const decision = decideRouteFetch(policyRef.current, Date.now());
    if (decision.fetch) void runRouteFetch(id, decision.reason);
  }, [runRouteFetch]);

  // ───────────────────────── incoming location ─────────────────────────

  const endTracking = useCallback(() => {
    setTrackingEnded(true);
    cancelRouteWork();
    pollAbortRef.current?.abort();
    trackingSubRef.current.forEach((sub) => {
      try { sub.unsubscribe(); } catch {}
    });
    trackingSubRef.current = [];
  }, [cancelRouteWork]);

  const applyLocation = useCallback(
    (payload: TrackingLocationResponse & Record<string, any>, expectedBookingId: string) => {
      if (expectedBookingId !== activeBookingIdRef.current) return;
      // Cross-booking guard: a frame that names another booking is dropped.
      if (payload.bookingId && payload.bookingId !== expectedBookingId) return;
      if (
        payload.status === 'TRACKING_ENDED' ||
        payload.status === 'ARRIVED' ||
        payload.type === 'WORKER_ARRIVED' ||
        payload.type === 'BOOKING_TRACKING_STOPPED' ||
        payload.trackingActive === false
      ) {
        endTracking();
        return;
      }
      const latitude = payload.latitude ?? payload.lat;
      const longitude = payload.longitude ?? payload.lng;
      if (payload.found === false || !isValidCoordinate(latitude ?? NaN, longitude ?? NaN)) return;

      const rawTimestamp = payload.timestamp ?? payload.serverTimestamp ?? payload.updatedAt;
      const parsedTimestamp = parseLocationTimestamp(rawTimestamp);
      // Reject frames without an authoritative timestamp from device or server — never substitute Date.now() for GPS
      if (parsedTimestamp === null || !Number.isFinite(parsedTimestamp) || parsedTimestamp <= 0) return;
      const timestamp = parsedTimestamp;

      // Server-assigned monotonic sequence check: discard older/duplicate sequence numbers
      if (typeof payload.sequenceNumber === 'number' && Number.isFinite(payload.sequenceNumber)) {
        if (lastSequenceRef.current !== null && payload.sequenceNumber <= lastSequenceRef.current) {
          return;
        }
        lastSequenceRef.current = payload.sequenceNumber;
      }

      // Out-of-order / replayed / future-dated frames never overwrite a newer position.
      if (!isAcceptableLocationTimestamp(timestamp, lastUpdateRef.current)) return;

      const previous = partnerRef.current;
      // Physically impossible jumps (GPS teleport) are discarded.
      if (
        previous &&
        lastUpdateRef.current !== null &&
        !isSensibleGpsJump(previous.lat, previous.lng, latitude!, longitude!, timestamp - lastUpdateRef.current)
      ) {
        return;
      }

      const incomingBearing = payload.heading ?? payload.bearing;
      const bearing =
        typeof incomingBearing === 'number' && Number.isFinite(incomingBearing)
          ? incomingBearing
          : previous
            ? calculateBearing(previous.lat, previous.lng, latitude!, longitude!)
            : 0;
      const next: PartnerCoordinate = { lat: latitude!, lng: longitude!, bearing };

      partnerRef.current = next;
      lastUpdateRef.current = timestamp;
      const receivedAt = Date.now();
      lastReceivedRef.current = receivedAt;
      setPartnerPos(next);
      setHasPartnerLocation(true);
      setLastUpdateTimestamp(receivedAt);
      setIsGpsStale(false);

      // Promptly retry an initial route only when failure was due to missing worker location.
      // Do NOT clear retry backoff for auth, rate-limit, or configuration errors.
      if (!policyRef.current.hasRoute) {
        const canRetryNow =
          !routeFailure ||
          routeFailure.code === 'WORKER_LOCATION_UNAVAILABLE' ||
          routeFailure.code === 'WORKER_LOCATION_STALE';
        if (canRetryNow) {
          policyRef.current.retryNotBefore = null;
          failuresRef.current = 0;
        }
      }

      // Off-route detection against the current road polyline with windowed progress tracking.
      const currentRoute = routeRef.current;
      if (currentRoute) {
        const progress = projectOntoRoute(
          { latitude: next.lat, longitude: next.lng },
          currentRoute.polylineCoordinates,
          lastSegmentIndexRef.current,
          ROUTE_POLICY.OFF_ROUTE_METERS,
        );
        if (progress) {
          lastSegmentIndexRef.current = progress.segmentIndex;
          policyRef.current.offRouteStrikes = nextOffRouteStrikes(
            policyRef.current.offRouteStrikes,
            progress.distanceFromRouteMeters,
          );
        }
      }
      evaluateRoute();
    },
    [endTracking, evaluateRoute],
  );

  // ───────────────────────── reset when the booking changes ─────────────────────────

  useEffect(() => {
    cancelRouteWork();
    policyRef.current = initialRoutePolicyState();
    failuresRef.current = 0;
    authBlockedRef.current = false;
    partnerRef.current = null;
    routeRef.current = null;
    lastUpdateRef.current = null;
    lastReceivedRef.current = null;
    lastSequenceRef.current = null;
    lastSegmentIndexRef.current = 0;
    lastSocketLocationAtRef.current = null;
    setServerSnapshot(null);
    setPartnerPos(null);
    setHasPartnerLocation(false);
    setRoute(null);
    setRouteFailure(null);
    setTrackingEnded(false);
    setLastUpdateTimestamp(null);
    setIsGpsStale(false);
    setTrackingError(null);
  }, [bookingId, cancelRouteWork]);

  // ───────────────────────── booking status -> tracking lifecycle ─────────────────────────

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
        endTracking();
      }
    });
    return unsubscribe;
  }, [bookingId, endTracking]);

  useEffect(() => {
    if (!bookingId) return;
    if (status === 'ARRIVED') {
      trackingLifecycleManager.markArrived(bookingId);
      endTracking();
    } else if (status === 'IN_PROGRESS' || status === 'COMPLETED' || status === 'CANCELLED') {
      trackingLifecycleManager.stopTracking(bookingId, status);
      endTracking();
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        // Stop exposing the worker's location once the booking is over.
        partnerRef.current = null;
        routeRef.current = null;
        setPartnerPos(null);
        setHasPartnerLocation(false);
        setRoute(null);
        setRouteFailure(null);
      }
    } else if (status === 'ON_THE_WAY' || status === 'ACCEPTED' || status === 'CONFIRMED') {
      if (trackingLifecycleManager.getState(bookingId) !== 'ARRIVED') {
        setTrackingEnded(false);
        // A status change may make a previously fatal route answer valid again.
        policyRef.current.fatal = false;
        failuresRef.current = 0;
      }
    }
  }, [bookingId, status, endTracking]);

  // Arrived / in-progress: the road route and any ETA are obsolete (the worker marker stays frozen).
  useEffect(() => {
    if (!trackingActive) {
      routeRef.current = null;
      setRoute(null);
      setRouteFailure(null);
      policyRef.current = initialRoutePolicyState();
      cancelRouteWork();
    }
  }, [trackingActive, cancelRouteWork]);

  // ───────────────────────── GPS staleness ─────────────────────────

  useEffect(() => {
    if (!trackingActive) {
      setIsGpsStale(false);
      return;
    }
    const timer = setInterval(() => {
      const now = Date.now();
      setIsGpsStale(lastReceivedRef.current !== null && isLocationStale(lastReceivedRef.current, now, GPS_STALE_MS));
      setNowMs(now);
    }, 5000);
    return () => clearInterval(timer);
  }, [trackingActive]);

  // ───────────────────────── server tracking phase (why location may be missing) ─────────────────────────

  useEffect(() => {
    if (!bookingId || !trackingActive) {
      setServerSnapshot(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      const snap = await trackingApi.getTrackingSnapshot(bookingId, controller.signal);
      if (!cancelled && snap && snap.bookingId === bookingId) setServerSnapshot(snap);
    };
    void load();
    const timer = setInterval(() => void load(), SNAPSHOT_POLL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [bookingId, trackingActive]);

  // ───────────────────────── single shared STOMP connection ─────────────────────────

  const subscribeTracking = useCallback((client: Client, id: string) => {
    if (trackingSubRef.current.length > 0) return;
    const sub1 = client.subscribe(`/topic/tracking/${id}`, (message) => {
      handleFrameRef.current(message.body, id);
    });
    const sub2 = client.subscribe(`/topic/track/${id}`, (message) => {
      handleFrameRef.current(message.body, id);
    });
    trackingSubRef.current = [sub1, sub2];
  }, []);

  const handleFrame = useCallback(
    (body: string, id: string) => {
      if (id !== activeBookingIdRef.current) return;
      let event: Record<string, any>;
      try {
        event = JSON.parse(body);
      } catch (error) {
        console.warn('[LiveTracking] Ignored malformed frame:', error);
        return;
      }
      if (!event || typeof event !== 'object') return;
      if (event.bookingId && event.bookingId !== id) return; // another booking's frame

      trackingLifecycleManager.processRemoteEvent(id, event);

      const hasCoords = isValidCoordinate(
        event.latitude ?? event.lat ?? NaN,
        event.longitude ?? event.lng ?? NaN,
      );
      const isLocationFrame = hasCoords && (!event.type || event.type === 'WORKER_LOCATION_UPDATED');
      if (isLocationFrame) {
        lastSocketLocationAtRef.current = Date.now();
        if (trackingActiveRef.current) applyLocation(event, id);
        return;
      }
      applyLocation(event, id); // stop-type frames end tracking
      onBookingEventRef.current?.(event);
    },
    [applyLocation],
  );
  useEffect(() => {
    handleFrameRef.current = handleFrame;
  }, [handleFrame]);

  useEffect(() => {
    if (!socketWanted || !bookingId) return;
    let cancelled = false;
    const id = bookingId;

    setConnectionStatus('CONNECTING');
    setTrackingError(null);

    const client = new Client({
      brokerURL: TRACKING_WS_URL,
      reconnectDelay: 1000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      maxReconnectDelay: 30000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // Fresh credentials on EVERY (re)connect, so an expired token is never replayed after a network drop.
      beforeConnect: async (c) => {
        const headers = await getAuthHeaders();
        if (cancelled) return;
        c.connectHeaders = headers;
      },
      onConnect: () => {
        if (cancelled) return;
        setSocketConnected(true);
        setConnectionStatus('CONNECTED');
        setTrackingError(null);
        // stompjs drops subscriptions on reconnect: rebuild them from scratch (no duplicates).
        trackingSubRef.current.forEach((s) => {
          try { s.unsubscribe(); } catch {}
        });
        trackingSubRef.current = [];
        bookingSubRef.current.forEach((s) => {
          try { s.unsubscribe(); } catch {}
        });
        bookingSubRef.current = [
          client.subscribe(`/topic/booking/${id}`, (m) => handleFrameRef.current(m.body, id)),
        ];
        if (trackingActiveRef.current) subscribeTracking(client, id);
        // Fill the gap left by the disconnect without waiting for the worker's next ping.
        void refreshLocationRef.current();
      },
      onDisconnect: () => {
        setSocketConnected(false);
        setConnectionStatus('DISCONNECTED');
      },
      onWebSocketClose: () => {
        trackingSubRef.current = [];
        bookingSubRef.current = [];
        setSocketConnected(false);
        if (!cancelled) setConnectionStatus('DISCONNECTED');
      },
      onWebSocketError: () => {
        setSocketConnected(false);
        if (!cancelled) setConnectionStatus('DISCONNECTED');
      },
      onStompError: (frame) => {
        const detail = frame.headers.message || 'Tracking service rejected the connection.';
        setSocketConnected(false);
        if (/401|403|unauthori[sz]ed|forbidden|expired|verified sign-in|not authorized/i.test(detail)) {
          setConnectionStatus('AUTH_ERROR');
          setTrackingError('Your session cannot access this booking. Please sign in again.');
          authBlockedRef.current = true;
          void client.deactivate();
        } else {
          setConnectionStatus('DISCONNECTED');
          setTrackingError(detail);
        }
      },
    });
    clientRef.current = client;
    client.activate();

    return () => {
      cancelled = true;
      trackingSubRef.current.forEach((s) => {
        try { s.unsubscribe(); } catch {}
      });
      trackingSubRef.current = [];
      bookingSubRef.current.forEach((s) => {
        try { s.unsubscribe(); } catch {}
      });
      bookingSubRef.current = [];
      if (clientRef.current === client) clientRef.current = null;
      setSocketConnected(false);
      setConnectionStatus('DISCONNECTED');
      void client.deactivate();
    };
  }, [socketWanted, bookingId, subscribeTracking]);

  // Location subscription follows the travel stage on the SAME connection: it is dropped on arrival and
  // never exists in any other stage, so the customer stops receiving the worker's position.
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !socketConnected || !bookingId) return;
    if (trackingActive) {
      subscribeTracking(client, bookingId);
    } else if (trackingSubRef.current.length > 0) {
      trackingSubRef.current.forEach((s) => {
        try { s.unsubscribe(); } catch {}
      });
      trackingSubRef.current = [];
    }
  }, [trackingActive, socketConnected, bookingId, subscribeTracking]);

  // ───────────────────────── HTTP snapshot / limited fallback ─────────────────────────

  const refreshLocation = useCallback(async () => {
    const id = activeBookingIdRef.current;
    if (!id || !trackingActiveRef.current || pollInFlightRef.current || authBlockedRef.current) return;
    pollInFlightRef.current = true;
    const controller = new AbortController();
    pollAbortRef.current = controller;
    try {
      const location = await trackingApi.getLatestLocation(id, controller.signal);
      if (!controller.signal.aborted) applyLocation(location as any, id);
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          authBlockedRef.current = true;
          setConnectionStatus('AUTH_ERROR');
          setTrackingError('Your session cannot access this booking. Please sign in again.');
        }
      }
    } finally {
      if (pollAbortRef.current === controller) pollAbortRef.current = null;
      pollInFlightRef.current = false;
    }
  }, [applyLocation]);
  useEffect(() => {
    refreshLocationRef.current = refreshLocation;
  }, [refreshLocation]);

  // ───────────────────────── periodic location & route sync ─────────────────────────
  // WebSocket is primary. REST polling is fallback / recovery when socket is silent or disconnected.
  useEffect(() => {
    if (!trackingActive) return;
    // Immediate refresh on mount or status change
    void refreshLocation();
    const interval = Math.max(3000, pollIntervalMs);
    const timer = setInterval(() => {
      const now = Date.now();
      const socketSilent =
        lastSocketLocationAtRef.current === null || now - lastSocketLocationAtRef.current > 12_000;
      if (!socketConnected || socketSilent || !partnerRef.current || isGpsStale) {
        void refreshLocation();
      }
    }, interval);
    return () => {
      clearInterval(timer);
      pollAbortRef.current?.abort();
    };
  }, [trackingActive, socketConnected, isGpsStale, refreshLocation, pollIntervalMs]);

  // Re-evaluate the route on a 7-second timer (updates ETA and route while moving or stationary).
  useEffect(() => {
    if (!trackingActive) return;
    evaluateRoute();
    const timer = setInterval(evaluateRoute, 7000);
    return () => clearInterval(timer);
  }, [trackingActive, evaluateRoute]);

  // Customer app returns to the foreground: refresh immediately and make sure the socket is back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const client = clientRef.current;
      if (client && !client.active) client.activate();
      if (trackingActiveRef.current) {
        void refreshLocationRef.current();
        evaluateRoute();
      }
    });
    return () => sub.remove();
  }, [evaluateRoute]);

  useEffect(
    () => () => {
      routeAbortRef.current?.abort();
      pollAbortRef.current?.abort();
      trackingSubRef.current.forEach((s) => {
        try { s.unsubscribe(); } catch {}
      });
      trackingSubRef.current = [];
      bookingSubRef.current.forEach((s) => {
        try { s.unsubscribe(); } catch {}
      });
      bookingSubRef.current = [];
      if (clientRef.current) void clientRef.current.deactivate();
    },
    [],
  );

  // ───────────────────────── derived, display-only values ─────────────────────────

  const routeCoordinates = useMemo<LatLngCoordinate[]>(() => {
    if (!trackingActive || !route) return [];
    if (!partnerPos) return route.polylineCoordinates;
    const sliced = sliceRemainingRoute(
      route.polylineCoordinates,
      { latitude: partnerPos.lat, longitude: partnerPos.lng },
      lastSegmentIndexRef.current,
      ROUTE_POLICY.OFF_ROUTE_METERS,
    );
    if (sliced.progress) {
      lastSegmentIndexRef.current = sliced.progress.segmentIndex;
    }
    return sliced.remainingPolyline;
  }, [trackingActive, route, partnerPos]);

  const remaining = useMemo(() => {
    if (!trackingActive || !route || !partnerPos) return null;
    return computeRemaining(
      { polyline: route.polylineCoordinates, distanceMeters: route.distanceMeters, durationSeconds: route.durationSeconds },
      { latitude: partnerPos.lat, longitude: partnerPos.lng },
      ROUTE_POLICY.OFF_ROUTE_METERS,
      lastSegmentIndexRef.current,
    );
  }, [trackingActive, route, partnerPos]);

  // A route that keeps failing to refresh stops supporting an ETA after a while.
  const routeTooOldForEta = Boolean(
    route && routeFailure && nowMs - route.calculatedAtMs > ROUTE_POLICY.ETA_MAX_AGE_MS,
  );

  const etaSeconds = remaining?.status === 'ON_ROUTE' && !routeTooOldForEta ? remaining.remainingSeconds : null;
  const remainingMeters = remaining?.status === 'ON_ROUTE' && !routeTooOldForEta ? remaining.remainingMeters : null;
  const rerouting = remaining?.status === 'OFF_ROUTE';

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
    const phase = serverSnapshot?.phase;
    if (phase === 'GPS_PERMISSION_DENIED' && (!hasPartnerLocation || isGpsStale)) {
      distanceText = "Partner's location sharing is turned off";
      etaText = 'ETA unavailable';
    } else if (phase === 'LOCATION_UNAVAILABLE' && serverSnapshot?.deviceGpsState === 'GPS_DISABLED' && (!hasPartnerLocation || isGpsStale)) {
      distanceText = "Partner's GPS is switched off";
      etaText = 'ETA unavailable';
    } else if (!hasPartnerLocation || !partnerPos) {
      distanceText = status === 'ON_THE_WAY' ? 'Waiting for partner location' : 'Partner will start the trip soon';
      etaText = 'ETA unavailable';
    } else if (isGpsStale) {
      distanceText = 'Location updates paused';
      etaText = 'Waiting for partner location';
    } else if (etaSeconds !== null && remainingMeters !== null) {
      distanceText = `${formatDistance(remainingMeters)} away`;
      etaText = formatDuration(Math.max(60, etaSeconds)); // never "0 mins" while still travelling
    } else if (rerouting) {
      distanceText = 'Updating route…';
      etaText = 'Rerouting…';
    } else if (routeLoading && !route) {
      distanceText = 'Calculating route…';
      etaText = 'Calculating ETA…';
    } else {
      // No real route: say so. Never substitute an invented distance or ETA.
      distanceText = 'Route unavailable';
      etaText = 'ETA unavailable';
    }
  }

  // One customer-facing sentence explaining why the road line / ETA may be missing (or null if all is well).
  const routeNotice: string | null =
    !trackingActive || status === 'ARRIVED'
      ? null
      : routeFailure && !(route && !routeFailure.fatal && routeFailure.code.startsWith('WORKER_LOCATION'))
        ? routeFailure.message
        : rerouting
          ? 'Your partner took a different road. Updating the route…'
          : null;

  return {
    partnerPos,
    hasPartnerLocation,
    isLiveConnected: socketConnected && trackingActive,
    connectionStatus,
    trackingError,
    routeCoordinates,
    route,
    routeLoading,
    routeFailure,
    routeNotice,
    rerouting,
    distanceText,
    etaText,
    etaSeconds,
    remainingMeters,
    isGpsStale,
    /** Local receipt time of the last accepted frame (this phone's clock). */
    lastUpdateTimestamp,
    /** Server tracking phase / device state / partner card (null until loaded). */
    serverSnapshot,
    trackingEnded,
    refreshLocation,
  };
}
