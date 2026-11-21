/**
 * When the customer app may ask the server for a (paid) road route, and how it reacts to failures.
 *
 * Worker GPS arrives every ~5 s, but a route is NOT requested per GPS update. A request is made only for:
 *   - the first route (INITIAL),
 *   - a slow periodic ETA refresh (PERIODIC, 45 s),
 *   - the worker leaving the suggested road (OFF_ROUTE, after 2 consecutive fixes > 60 m away).
 * The server enforces its own, stricter cache/throttle on top of this, so these rules are defence in depth.
 *
 * Pure functions only - covered by tests/route-geometry.test.cjs.
 */

export type RouteFetchReason = 'INITIAL' | 'PERIODIC' | 'OFF_ROUTE';

export const ROUTE_POLICY = {
  /** Distance from the polyline beyond which a GPS fix counts as "off the suggested route". */
  OFF_ROUTE_METERS: 60,
  /** Consecutive off-route fixes required before rerouting (filters single GPS spikes). */
  OFF_ROUTE_STRIKES: 2,
  /** Routine refresh of the traffic-aware duration while the worker is moving. */
  PERIODIC_REFRESH_MS: 45_000,
  /** Earliest reroute after the previous successful route. */
  OFF_ROUTE_MIN_GAP_MS: 8_000,
  /** Never fire two attempts closer together than this, whatever happened. */
  MIN_ATTEMPT_GAP_MS: 3_000,
  BACKOFF_BASE_MS: 5_000,
  BACKOFF_MAX_MS: 60_000,
  /** Slow retry for conditions that need an ops/config fix or a different geography. */
  SLOW_RETRY_MS: 60_000,
  /** A route this old, while refreshes keep failing, no longer supports an ETA. */
  ETA_MAX_AGE_MS: 150_000,
} as const;

export interface RoutePolicyState {
  hasRoute: boolean;
  inFlight: boolean;
  /** A non-retryable server answer: stop asking until the booking/status changes. */
  fatal: boolean;
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
  retryNotBefore: number | null;
  offRouteStrikes: number;
}

export type RouteDecision =
  | { fetch: true; reason: RouteFetchReason }
  | { fetch: false; nextCheckMs: number | null };

export function initialRoutePolicyState(): RoutePolicyState {
  return {
    hasRoute: false,
    inFlight: false,
    fatal: false,
    lastAttemptAt: null,
    lastSuccessAt: null,
    retryNotBefore: null,
    offRouteStrikes: 0,
  };
}

export function decideRouteFetch(s: RoutePolicyState, now: number): RouteDecision {
  if (s.inFlight || s.fatal) return { fetch: false, nextCheckMs: null };

  if (s.retryNotBefore !== null && now < s.retryNotBefore) {
    return { fetch: false, nextCheckMs: s.retryNotBefore - now };
  }
  if (s.lastAttemptAt !== null && now - s.lastAttemptAt < ROUTE_POLICY.MIN_ATTEMPT_GAP_MS) {
    return { fetch: false, nextCheckMs: ROUTE_POLICY.MIN_ATTEMPT_GAP_MS - (now - s.lastAttemptAt) };
  }

  if (!s.hasRoute) return { fetch: true, reason: 'INITIAL' };

  const sinceSuccess = s.lastSuccessAt === null ? Infinity : now - s.lastSuccessAt;

  if (s.offRouteStrikes >= ROUTE_POLICY.OFF_ROUTE_STRIKES) {
    if (sinceSuccess >= ROUTE_POLICY.OFF_ROUTE_MIN_GAP_MS) return { fetch: true, reason: 'OFF_ROUTE' };
    return { fetch: false, nextCheckMs: ROUTE_POLICY.OFF_ROUTE_MIN_GAP_MS - sinceSuccess };
  }
  if (sinceSuccess >= ROUTE_POLICY.PERIODIC_REFRESH_MS) return { fetch: true, reason: 'PERIODIC' };
  return { fetch: false, nextCheckMs: ROUTE_POLICY.PERIODIC_REFRESH_MS - sinceSuccess };
}

/** Consecutive off-route counter: any on-route fix resets it. */
export function nextOffRouteStrikes(previous: number, distanceFromRouteMeters: number): number {
  return distanceFromRouteMeters > ROUTE_POLICY.OFF_ROUTE_METERS ? previous + 1 : 0;
}

/** Exponential backoff, never shorter than the server's Retry-After hint. */
export function backoffMs(consecutiveFailures: number, retryAfterSeconds?: number): number {
  const n = Math.max(1, consecutiveFailures);
  const exp = Math.min(ROUTE_POLICY.BACKOFF_BASE_MS * 2 ** (n - 1), ROUTE_POLICY.BACKOFF_MAX_MS);
  const hint = typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 0;
  return Math.max(exp, Math.min(hint, 5 * 60_000));
}

export interface RouteFailure {
  /** Server error code, or NETWORK_ERROR / HTTP_<status> / UNKNOWN when the server gave none. */
  code: string;
  /** Safe to show to the customer. */
  message: string;
  retryable: boolean;
  /** Stop requesting until the booking or its status changes. */
  fatal: boolean;
  /** Needs a long delay between attempts (config / geography problems). */
  slowRetry: boolean;
  retryAfterSeconds?: number;
}

const FATAL_CODES = new Set([
  'JWT_REQUIRED',
  'NOT_BOOKING_PARTICIPANT',
  'BOOKING_NOT_FOUND',
  'TRACKING_NOT_ACTIVE',
  'WORKER_NOT_ASSIGNED',
  'DESTINATION_UNAVAILABLE',
]);
const SLOW_CODES = new Set(['ROUTING_NOT_CONFIGURED', 'NO_ROUTE_FOUND']);

const MESSAGES: Record<string, string> = {
  JWT_REQUIRED: "Your session can't access this booking's route. Please sign in again.",
  NOT_BOOKING_PARTICIPANT: "Your session can't access this booking's route. Please sign in again.",
  BOOKING_NOT_FOUND: 'This booking could not be found.',
  TRACKING_NOT_ACTIVE: 'Live route is only shown while your partner is on the way.',
  WORKER_NOT_ASSIGNED: 'A partner has not been assigned yet.',
  DESTINATION_UNAVAILABLE:
    "This booking's service address has no map location, so the route can't be drawn. Please contact support.",
  WORKER_LOCATION_UNAVAILABLE: "Waiting for your partner's live location…",
  WORKER_LOCATION_STALE: "Your partner's location is delayed. The route will update shortly.",
  NO_ROUTE_FOUND: 'No road route could be found to your address.',
  ROUTING_NOT_CONFIGURED: 'Live route is temporarily unavailable. Your partner is still shown on the map.',
  ROUTING_RATE_LIMITED: 'Live route is busy. Retrying shortly…',
  ROUTING_PROVIDER_ERROR: 'Live route is temporarily unavailable. Retrying shortly…',
  ROUTING_TIMEOUT: 'Live route is taking longer than usual. Retrying shortly…',
  NETWORK_ERROR: "You're offline. Reconnecting…",
};

export function classifyRouteFailure(input: {
  code?: string;
  status?: number;
  message?: string;
  retryAfterSeconds?: number;
  network?: boolean;
}): RouteFailure {
  let code = input.code;
  if (!code) {
    if (input.network) code = 'NETWORK_ERROR';
    else if (typeof input.status === 'number') code = `HTTP_${input.status}`;
    else code = 'UNKNOWN';
  }
  const fatal = FATAL_CODES.has(code);
  const slowRetry = SLOW_CODES.has(code);
  return {
    code,
    message: MESSAGES[code] ?? 'Live route is temporarily unavailable. Retrying shortly…',
    retryable: !fatal,
    fatal,
    slowRetry,
    retryAfterSeconds: input.retryAfterSeconds,
  };
}
