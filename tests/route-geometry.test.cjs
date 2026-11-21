const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const { decodePolyline, decodePolylineStrict, toGeoJsonCoordinates } = require('../src/services/coordinates.ts');
const { projectOntoRoute, computeRemaining, collectBoundsPoints } = require('../src/services/routeGeometry.ts');
const {
  ROUTE_POLICY,
  decideRouteFetch,
  initialRoutePolicyState,
  nextOffRouteStrikes,
  backoffMs,
  classifyRouteFailure,
} = require('../src/services/routePolicy.ts');

// ~111.32 km per degree of longitude at the equator; at 17.5N it is 111.32*cos(17.5deg) km.
const M_PER_DEG_LAT = 111_195;
const approx = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} expected ~${expected} (+/-${tol}) but got ${actual}`);

// A straight 2 km east-west road at 17.5N: 3 points, ~1 km apart.
const LAT = 17.5;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((LAT * Math.PI) / 180);
const dLng = 1000 / M_PER_DEG_LNG;
const ROAD = [
  { latitude: LAT, longitude: 78.5 },
  { latitude: LAT, longitude: 78.5 + dLng },
  { latitude: LAT, longitude: 78.5 + 2 * dLng },
];

// ───────────────────────── polyline decoding ─────────────────────────

test('decodes the polyline documented by Google in (latitude, longitude) order', () => {
  const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  assert.deepEqual(pts, [
    { latitude: 38.5, longitude: -120.2 },
    { latitude: 40.7, longitude: -120.95 },
    { latitude: 43.252, longitude: -126.453 },
  ]);
});

test('strict decoder rejects malformed input instead of returning a partial or duplicated line', () => {
  const good = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
  assert.ok(decodePolylineStrict(good));
  assert.equal(decodePolylineStrict(good.slice(0, -3)), null, 'truncated varint');
  assert.equal(decodePolylineStrict('_p~iF'), null, 'latitude without longitude');
  assert.equal(decodePolylineStrict('_p~iF~ps|U '), null, 'illegal character');
  assert.equal(decodePolylineStrict(''), null);
  assert.equal(decodePolylineStrict(undefined), null);
  assert.equal(decodePolylineStrict(42), null);
  assert.deepEqual(decodePolyline('not a polyline!'), []);
});

test('decoded Indian coordinates keep lat ~17 and lng ~78 (no latitude/longitude swap)', () => {
  // Encoded from (17.4485, 78.3748) -> (17.4585, 78.3848)
  const pts = decodePolyline('c|niBoqj}Mo}@o}@');
  assert.equal(pts.length, 2);
  approx(pts[0].latitude, 17.4485, 1e-9, 'p0 lat');
  approx(pts[0].longitude, 78.3748, 1e-9, 'p0 lng');
  approx(pts[1].latitude, 17.4585, 1e-9, 'p1 lat');
  approx(pts[1].longitude, 78.3848, 1e-9, 'p1 lng');
});

test('tracking-route [lat, lng] pairs convert to GeoJSON [lng, lat] without guessing', () => {
  assert.deepEqual(toGeoJsonCoordinates([[17.4485, 78.3748], [17.4585, 78.3848]]), [
    [78.3748, 17.4485],
    [78.3848, 17.4585],
  ]);
  assert.equal(toGeoJsonCoordinates([[91, 78.4], [17.5, 78.5]]), null, '91 is not a latitude');
  assert.equal(toGeoJsonCoordinates([[17.4, 78.4]]), null);
});

// ───────────────────────── route geometry ─────────────────────────

test('a point on the road projects with ~0 offset and the right distance remaining', () => {
  const mid = { latitude: LAT, longitude: 78.5 + dLng }; // exactly 1 km along a 2 km road
  const p = projectOntoRoute(mid, ROAD);
  approx(p.totalMeters, 2000, 5, 'total');
  approx(p.alongMeters, 1000, 5, 'along');
  approx(p.remainingMeters, 1000, 5, 'remaining');
  assert.ok(p.distanceFromRouteMeters < 1);
});

test('a point beside the road reports its perpendicular distance', () => {
  const beside = { latitude: LAT + 100 / M_PER_DEG_LAT, longitude: 78.5 + 0.5 * dLng }; // 100 m north of 500 m mark
  const p = projectOntoRoute(beside, ROAD);
  approx(p.distanceFromRouteMeters, 100, 2, 'offset');
  approx(p.alongMeters, 500, 5, 'along');
});

test('points before the start and beyond the end clamp to the route ends', () => {
  const before = projectOntoRoute({ latitude: LAT, longitude: 78.5 - 0.01 }, ROAD);
  assert.equal(Math.round(before.alongMeters), 0);
  const beyond = projectOntoRoute({ latitude: LAT, longitude: 78.5 + 3 * dLng }, ROAD);
  assert.equal(Math.round(beyond.remainingMeters), 0);
  assert.ok(beyond.distanceFromRouteMeters > 900);
});

test('projection needs at least two points', () => {
  assert.equal(projectOntoRoute({ latitude: LAT, longitude: 78.5 }, []), null);
  assert.equal(projectOntoRoute({ latitude: LAT, longitude: 78.5 }, [ROAD[0]]), null);
});

test('remaining distance and time shrink proportionally from the provider totals', () => {
  const route = { polyline: ROAD, distanceMeters: 2400, durationSeconds: 600 }; // provider data
  const quarterWay = { latitude: LAT, longitude: 78.5 + 0.5 * dLng }; // 500 m of 2000 m done -> 75% left
  const r = computeRemaining(route, quarterWay);
  assert.equal(r.status, 'ON_ROUTE');
  approx(r.remainingMeters, 1800, 12, 'remaining metres');
  approx(r.remainingSeconds, 450, 4, 'remaining seconds');
});

test('worker on the road at the destination has ~nothing left', () => {
  const route = { polyline: ROAD, distanceMeters: 2000, durationSeconds: 300 };
  const r = computeRemaining(route, ROAD[2]);
  assert.equal(r.status, 'ON_ROUTE');
  assert.ok(r.remainingMeters <= 2 && r.remainingSeconds <= 1);
});

test('no number is produced for a worker off the road, or without a route/worker', () => {
  const route = { polyline: ROAD, distanceMeters: 2000, durationSeconds: 300 };
  const off = computeRemaining(route, { latitude: LAT + 200 / M_PER_DEG_LAT, longitude: 78.5 + dLng });
  assert.equal(off.status, 'OFF_ROUTE');
  assert.equal(off.remainingMeters, undefined);
  assert.equal(computeRemaining(null, ROAD[0]).status, 'UNAVAILABLE');
  assert.equal(computeRemaining(route, null).status, 'UNAVAILABLE');
  assert.equal(computeRemaining({ ...route, distanceMeters: NaN }, ROAD[0]).status, 'UNAVAILABLE');
});

test('viewport bounds include worker, destination and every route vertex', () => {
  const w = { latitude: 17.46, longitude: 78.51 };
  const d = { latitude: 17.5, longitude: 78.54 };
  assert.equal(collectBoundsPoints(w, d, ROAD).length, 5);
  assert.equal(collectBoundsPoints(null, d, []).length, 1);
});

// ───────────────────────── route refresh policy (cost control) ─────────────────────────

const T0 = 1_000_000;
const withState = (over) => ({ ...initialRoutePolicyState(), ...over });

test('first route is requested immediately, as INITIAL', () => {
  assert.deepEqual(decideRouteFetch(initialRoutePolicyState(), T0), { fetch: true, reason: 'INITIAL' });
});

test('never requests while one is in flight or after a fatal answer', () => {
  assert.equal(decideRouteFetch(withState({ inFlight: true }), T0).fetch, false);
  assert.equal(decideRouteFetch(withState({ fatal: true }), T0).fetch, false);
});

test('GPS ticks every 5 s do NOT trigger route requests', () => {
  const s = withState({ hasRoute: true, lastAttemptAt: T0, lastSuccessAt: T0 });
  let fetches = 0;
  for (let tick = 1; tick <= 8; tick++) {
    // 8 ticks = 40 s, all inside the 45 s periodic window
    if (decideRouteFetch(s, T0 + tick * 5_000).fetch) fetches++;
  }
  assert.equal(fetches, 0);
});

test('periodic refresh fires once the 45 s window has elapsed, not before', () => {
  const s = withState({ hasRoute: true, lastAttemptAt: T0, lastSuccessAt: T0 });
  assert.equal(decideRouteFetch(s, T0 + 44_999).fetch, false);
  assert.deepEqual(decideRouteFetch(s, T0 + 45_000), { fetch: true, reason: 'PERIODIC' });
});

test('off-route needs two consecutive strikes and respects the minimum gap', () => {
  const base = { hasRoute: true, lastAttemptAt: T0, lastSuccessAt: T0 };
  assert.equal(decideRouteFetch(withState({ ...base, offRouteStrikes: 1 }), T0 + 10_000).fetch, false, 'one spike is not enough');
  const two = withState({ ...base, offRouteStrikes: 2 });
  assert.equal(decideRouteFetch(two, T0 + 5_000).fetch, false, 'inside the 8 s floor');
  assert.deepEqual(decideRouteFetch(two, T0 + 9_000), { fetch: true, reason: 'OFF_ROUTE' });
});

test('retry-after and failure backoff are honoured; attempts are never closer than 3 s', () => {
  const waiting = withState({ retryNotBefore: T0 + 20_000 });
  const d = decideRouteFetch(waiting, T0 + 5_000);
  assert.equal(d.fetch, false);
  assert.equal(d.nextCheckMs, 15_000);
  assert.equal(decideRouteFetch(waiting, T0 + 20_000).fetch, true);

  const justTried = withState({ lastAttemptAt: T0 });
  assert.equal(decideRouteFetch(justTried, T0 + 1_000).fetch, false);
  assert.equal(decideRouteFetch(justTried, T0 + 3_000).fetch, true);
});

test('off-route strikes count consecutive fixes only', () => {
  assert.equal(nextOffRouteStrikes(0, ROUTE_POLICY.OFF_ROUTE_METERS + 1), 1);
  assert.equal(nextOffRouteStrikes(1, ROUTE_POLICY.OFF_ROUTE_METERS + 50), 2);
  assert.equal(nextOffRouteStrikes(1, 10), 0, 'a good fix resets the counter');
  assert.equal(nextOffRouteStrikes(1, ROUTE_POLICY.OFF_ROUTE_METERS), 0, 'exactly at the threshold is on-route');
});

test('backoff grows exponentially, is capped, and never undercuts Retry-After', () => {
  assert.equal(backoffMs(1), 5_000);
  assert.equal(backoffMs(2), 10_000);
  assert.equal(backoffMs(3), 20_000);
  assert.equal(backoffMs(10), 60_000);
  assert.equal(backoffMs(1, 45), 45_000);
  assert.equal(backoffMs(4, 5), 40_000, 'exponential wins when larger than the hint');
});

// ───────────────────────── failure classification ─────────────────────────

test('non-retryable server answers stop further requests; transient ones keep retrying', () => {
  for (const code of ['NOT_BOOKING_PARTICIPANT', 'JWT_REQUIRED', 'TRACKING_NOT_ACTIVE', 'DESTINATION_UNAVAILABLE', 'WORKER_NOT_ASSIGNED', 'BOOKING_NOT_FOUND']) {
    const f = classifyRouteFailure({ code });
    assert.equal(f.fatal, true, code);
    assert.equal(f.retryable, false, code);
  }
  for (const code of ['WORKER_LOCATION_UNAVAILABLE', 'WORKER_LOCATION_STALE', 'ROUTING_PROVIDER_ERROR', 'ROUTING_TIMEOUT', 'ROUTING_RATE_LIMITED']) {
    const f = classifyRouteFailure({ code });
    assert.equal(f.fatal, false, code);
    assert.equal(f.retryable, true, code);
  }
  assert.equal(classifyRouteFailure({ code: 'ROUTING_NOT_CONFIGURED' }).slowRetry, true);
  assert.equal(classifyRouteFailure({ code: 'NO_ROUTE_FOUND' }).slowRetry, true);
});

test('failures without a server code are still classified and always carry a user-safe message', () => {
  assert.equal(classifyRouteFailure({ network: true }).code, 'NETWORK_ERROR');
  assert.equal(classifyRouteFailure({ status: 502 }).code, 'HTTP_502');
  assert.equal(classifyRouteFailure({}).code, 'UNKNOWN');
  for (const f of [classifyRouteFailure({ network: true }), classifyRouteFailure({ status: 500 }), classifyRouteFailure({ code: 'WEIRD' })]) {
    assert.ok(f.message.length > 10);
    assert.equal(f.retryable, true);
  }
});
