# Live tracking frontend contract

This frontend integration follows the HomeEase API reference supplied with the
tracking implementation. Confirm deployment URLs, authorization rules, and
STOMP authentication behavior against the running backend before release.

## Authentication and access control

- HTTP requests use the saved app token as `Authorization: Bearer <token>` and
  send `X-User-Id` only when the authenticated session contains a user ID.
- GPS publishing does not send a service-person ID. The server must derive the
  service-person identity from the authenticated principal and verify that the
  principal owns the assigned booking before accepting an update.
- The server must authorize every booking lookup, latest-location read, distance
  read, and WebSocket subscription. A customer may only read their own booking;
  a service person may only publish for their own assigned active booking.
- STOMP CONNECT carries the existing bearer token and user ID in its headers.
  The server must authenticate these CONNECT headers and reject expired or
  unauthorized sessions.

## Booking and GPS publishing

The existing booking client reads `GET /bookings/{bookingId}` from the main API.
Its declared booking fields include `bookingId`, `workerId`, `status`, `userLat`,
`userLng`, and `userLocation`.

The tracking client publishes to:

```text
POST /tracking/update-location
```

The current frontend sends `bookingId` (string), `lat`/`lng` (GPS numbers),
`bearing` (degrees), `speed` (km/h or null), `accuracy` (metres), and
`timestamp` (Unix epoch milliseconds), without a service-person ID. The API
reference does not specify this endpoint's request DTO; confirm these fields
against the controller before release.

## Customer tracking reads

```text
GET /tracking/latest/{bookingId}
GET /tracking/distance?bookingId={bookingId}&customerLat={lat}&customerLng={lng}
```

Latest-location events use `bookingId`, `workerId`, `latitude`, `longitude`,
`heading`, `speed`, `status`, and `timestamp`. The frontend also accepts legacy
`lat`/`lng`/`bearing` fields. The distance response can include `distanceKm`,
`etaMinutes`, and `workerLocation.lat`/`workerLocation.lng`; the frontend
converts these values to display units.

The UI accepts only valid latitude/longitude values, rejects events for a
different booking and out-of-order timestamps, and displays stale timestamps as
stale rather than replacing a newer position.

## WebSocket and route

The frontend connects to the native WebSocket STOMP broker at
`/ws`, and subscribes to the single booking-specific destination:

```text
/topic/tracking/{bookingId}
```

Message bodies use the latest-location fields described above. A payload with
`status: "TRACKING_ENDED"` or `trackingActive: false` ends the frontend's
subscription and polling for that booking. The alternate
`/topic/track/{bookingId}` destination is not used.

Road routing calls the tracking backend:

```text
GET /tracking/route?startLat={lat}&startLng={lng}&destLat={lat}&destLng={lng}
```

The response uses `distanceKm`, `durationMin`, and `coordinates` containing
`[latitude, longitude]` pairs. The frontend validates each coordinate and
explicitly converts pairs to GeoJSON `[longitude, latitude]` internally for the
Leaflet map. No routing provider is called directly by the app.

## Environment and foreground operation

Configure `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_TRACKING_API_URL`, and
`EXPO_PUBLIC_TRACKING_WS_URL` in the Expo environment. The development defaults
are HTTP/WS; production must use HTTPS/WSS. Provider keys stay on the backend.

GPS uses foreground permissions and stops when the navigation screen leaves the
foreground or unmounts. The current Expo config does not enable background
location. Continuous background tracking would require a separately reviewed
product decision, platform permissions, and an Expo config-plugin/native build
change.
