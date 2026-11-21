# Live tracking & road-route contract (customer app)

Status: implemented and unit/scenario tested. **Not yet verified on a device against the deployed backend** -
see "Verification status" at the end.

## What the customer sees

| Booking status | Map | Panel |
| --- | --- | --- |
| `SEARCHING` / `PENDING` | Booking address only | Matching state |
| `ACCEPTED` / `CONFIRMED` / `ON_THE_WAY` | Worker marker + destination + **blue road route** | Route-derived ETA / distance |
| `ARRIVED` | Marker frozen, route cleared | Service start PIN (server-authorized) |
| `IN_PROGRESS` | Marker frozen, no ETA | Service in progress |
| `COMPLETED` / `CANCELLED` | Worker position cleared, no subscriptions | Final state |

If a real route or ETA is not available the app says so (a notice on the map). It never draws a straight
line and never shows an estimated distance or ETA.

## Destination

The destination is the booking's **persisted** service address (`userLat` / `userLng` from `GET /bookings/{id}`).
There is no fallback to a pincode centroid, the customer's GPS, or a default city. If the booking has no usable
coordinates the map shows no destination marker and explains why. The route request carries **no coordinates**:
the server derives both ends itself.

## Route endpoint (core service)

```text
GET /api/v1/tracking/{bookingId}/route?reason=INITIAL|PERIODIC|OFF_ROUTE
Authorization: Bearer <signed JWT>
```

- Origin: the assigned worker's latest GPS fix (Redis `tracking:booking:{id}`), must be < 120 s old.
- Destination: `bookings.user_lat / user_lng`.
- Allowed callers: the booking's customer, its assigned worker, ADMIN. A bare `Bearer <uuid>` or `X-User-Id`
  is **not** accepted on this endpoint.
- Allowed booking statuses: `ACCEPTED`, `CONFIRMED`, `ON_THE_WAY`.
- Routing: Google Routes API `computeRoutes` (server side). The credential never reaches the app.

Response `200`:

```json
{
  "bookingId": "8b3b5cdf-e447-407d-9a30-40c6e165a131",
  "status": "ON_THE_WAY",
  "found": true,
  "provider": "google-routes-v2",
  "polyline": "c|niBoqj}Mo}@o}@",
  "polylineEncoding": "ENCODED_POLYLINE_1E5",
  "distanceMeters": 2860,
  "durationSeconds": 569,
  "staticDurationSeconds": 540,
  "origin":      { "lat": 17.4485, "lng": 78.3748, "recordedAtEpochMs": 1800000000000 },
  "destination": { "lat": 17.5014, "lng": 78.5390 },
  "calculatedAt": "2026-11-20T10:00:00.500Z",
  "calculatedAtEpochMs": 1800000000500,
  "cached": false,
  "refreshAfterSeconds": 20
}
```

`polyline` is a Google encoded polyline, precision 1e5, points ordered latitude then longitude. The app decodes
it with a strict decoder that rejects malformed input instead of drawing a partial line.

### Errors

Body: `{ timestamp, status, error, code, message, retryable, retryAfterSeconds? }` (+ `Retry-After` header).

| HTTP | `code` | Meaning | App behaviour |
| --- | --- | --- | --- |
| 401 | `JWT_REQUIRED` | No valid signed JWT | Stop; ask to sign in again |
| 403 | `NOT_BOOKING_PARTICIPANT` | Not this booking's customer/worker/admin | Stop |
| 404 | `BOOKING_NOT_FOUND` | Unknown booking | Stop |
| 409 | `TRACKING_NOT_ACTIVE` | Status not in the travel stage | Stop until status changes |
| 409 | `WORKER_NOT_ASSIGNED` | No worker yet | Stop until status changes |
| 422 | `DESTINATION_UNAVAILABLE` | Booking has no usable coordinates | Stop; tell the customer |
| 409 | `WORKER_LOCATION_UNAVAILABLE` | No GPS fix yet | Retry (server hint 5 s) |
| 409 | `WORKER_LOCATION_STALE` | Last fix > 120 s old | Retry |
| 404 | `NO_ROUTE_FOUND` | Provider found no drivable route | Slow retry (60 s) |
| 503 | `ROUTING_NOT_CONFIGURED` | Server key missing / rejected | Slow retry (60 s); notice shown |
| 429 | `ROUTING_RATE_LIMITED` | Provider quota | Retry after `Retry-After` |
| 502 | `ROUTING_PROVIDER_ERROR` | Provider failure / bad data | Exponential backoff 5 s -> 60 s |
| 504 | `ROUTING_TIMEOUT` | Provider too slow | Exponential backoff |

## Cost control (paid API)

Worker GPS arrives about every 5 s but a route is **not** requested per GPS update.

Client (`src/services/routePolicy.ts`): first route; periodic refresh every 45 s; reroute after 2 consecutive
fixes more than 60 m from the polyline (not sooner than 8 s after the last route); never two attempts within 3 s;
exponential backoff and `Retry-After` honoured; stale responses discarded (sequence id + `AbortController` +
booking check).

Server (`BookingRouteService`): per-booking cache - calls inside 20 s are served from cache; up to 60 s if the
worker moved less than 60 m; off-route may refresh after 8 s; single-flight so concurrent callers share one
provider call; failures are negative-cached 20 s+. All tunable through environment variables.

## Realtime

One STOMP connection per tracking screen (`wss://.../ws`), credentials refreshed on every reconnect:

- `/topic/booking/{bookingId}` - lifecycle events, while the booking is not completed/cancelled.
- `/topic/tracking/{bookingId}` - worker location, **only** while the booking is in the travel stage.

The old `/topic/tracking/update` and `/topic/track/{id}` subscriptions are gone. On reconnect the app takes one
HTTP snapshot (`GET /tracking/latest/{id}`); HTTP polling (10 s) runs **only** while the socket is down.
Frames naming another booking, out-of-order/replayed timestamps and physically impossible jumps are dropped.

## Environment

Customer app (public, bundled): `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_TRACKING_API_URL`,
`EXPO_PUBLIC_TRACKING_WS_URL`, and the Maps **SDK** key (restrict by Android package + SHA-1 / iOS bundle id).
Do not use this key for the Routes API.

Backend (secret, never in the app): `GOOGLE_ROUTES_API_KEY` (falls back to `GOOGLE_MAPS_API_KEY`) - restrict to
the Routes API and the server's egress IP. Optional tuning: `ROUTES_MIN_INTERVAL_SECONDS` (20),
`ROUTES_OFF_ROUTE_MIN_INTERVAL_SECONDS` (8), `ROUTES_MAX_AGE_SECONDS` (60), `ROUTES_REUSE_RADIUS_METERS` (60),
`ROUTES_LOCATION_STALE_SECONDS` (120), `ROUTES_ERROR_BACKOFF_SECONDS` (20), `GOOGLE_ROUTES_TRAVEL_MODE` (DRIVE),
`GOOGLE_ROUTES_ROUTING_PREFERENCE` (TRAFFIC_AWARE). Tracking service: `TRACKING_REQUIRE_ASSIGNMENT` (true),
`TRACKING_ROUTE_PROXY_PER_IDENTITY_PER_MINUTE` (12), `TRACKING_ROUTE_PROXY_GLOBAL_PER_MINUTE` (300).

Nginx must send `GET /api/v1/tracking/<uuid>/route` to the **core** service (see `nginx/conf.d/homeease_tracking.conf`).

## Verification status

Verified here: type-check, lint (0 errors), 31 client unit tests, 434 core + 89 tracking-service backend tests (one
core test needs a live Postgres and errors in this environment), a lifecycle scenario against a fake Routes API,
and a live Routes API call decoded by the client code. **Not verified here**: real devices, the
deployed EC2/Nginx stack, real bookings with two phones, `nginx -t`, and a real-Postgres run of the route loader.
