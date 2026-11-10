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

const {
  isValidCoordinate,
  isValidGeoJsonRoute,
  toGeoJsonCoordinates,
  toGoogleMapCoordinates,
} = require('../src/services/coordinates.ts');
const {
  formatDistance,
  formatDuration,
  isAcceptableLocationTimestamp,
  parseLocationTimestamp,
  shouldRecalculateRoute,
  shortestAngleDistance,
  normalizeHeading,
  isSensibleGpsJump,
  filterHeadingJitter,
} = require('../src/services/trackingMath.ts');

test('validates coordinates and converts GeoJSON longitude/latitude order', () => {
  assert.equal(isValidCoordinate(90, 180), true);
  assert.equal(isValidCoordinate(-91, 0), false);
  assert.equal(isValidCoordinate(Number.NaN, 0), false);
  assert.deepEqual(
    toGoogleMapCoordinates([
      [78.4, 17.4],
      [78.5, 17.5],
    ]),
    [
      { latitude: 17.4, longitude: 78.4 },
      { latitude: 17.5, longitude: 78.5 },
    ],
  );
});

test('rejects invalid or incomplete GeoJSON road geometry', () => {
  assert.equal(isValidGeoJsonRoute([[78.4, 17.4], [78.5, 17.5]]), true);
  assert.equal(isValidGeoJsonRoute([[78.4, 17.4]]), false);
  assert.equal(isValidGeoJsonRoute([[181, 17.4], [78.5, 17.5]]), false);
  assert.equal(isValidGeoJsonRoute(null), false);
});

test('converts tracking route latitude/longitude pairs to GeoJSON order', () => {
  assert.deepEqual(
    toGeoJsonCoordinates([
      [17.4485, 78.3748],
      [17.4585, 78.3848],
    ]),
    [
      [78.3748, 17.4485],
      [78.3848, 17.4585],
    ],
  );
  assert.equal(toGeoJsonCoordinates([[91, 78.4], [17.5, 78.5]]), null);
  assert.equal(toGeoJsonCoordinates([[17.4, 78.4]]), null);
});

test('formats route distance and duration safely', () => {
  assert.equal(formatDistance(320), '320 m');
  assert.equal(formatDistance(1250), '1.3 km');
  assert.equal(formatDistance(-1), 'Unavailable');
  assert.equal(formatDuration(60), '1 min');
  assert.equal(formatDuration(3660), '1h 1m');
  assert.equal(formatDuration(Number.NaN), 'Unavailable');
});

test('throttles route recalculation by movement and maximum route age', () => {
  const previous = { lat: 0, lng: 0, requestedAt: 1000 };
  assert.equal(shouldRecalculateRoute(null, { lat: 0, lng: 0 }, 1000), true);
  assert.equal(
    shouldRecalculateRoute(previous, { lat: 0, lng: 0.0005 }, 2000),
    false,
  );
  assert.equal(
    shouldRecalculateRoute(previous, { lat: 0, lng: 0.001 }, 2000),
    true,
  );
  assert.equal(shouldRecalculateRoute(previous, { lat: 0, lng: 0 }, 46000), true);
  assert.equal(shouldRecalculateRoute(previous, { lat: 91, lng: 0 }, 2000), false);
});

test('normalizes location timestamps and rejects stale or future updates', () => {
  assert.equal(parseLocationTimestamp(1700000000), 1700000000000);
  assert.equal(parseLocationTimestamp('not-a-date'), null);
  assert.equal(isAcceptableLocationTimestamp(2000, 1000, 2000), true);
  assert.equal(isAcceptableLocationTimestamp(1000, 2000, 2000), false);
  assert.equal(isAcceptableLocationTimestamp(62001, 0, 1000), false);
});

test('handles shortest angular distance and 359 to 1 degree transition seamlessly', () => {
  // 359° to 1° is +2° turn (clockwise)
  assert.equal(shortestAngleDistance(359, 1), 2);
  // 1° to 359° is -2° turn (counter-clockwise)
  assert.equal(shortestAngleDistance(1, 359), -2);
  // 350° to 10° is +20°
  assert.equal(shortestAngleDistance(350, 10), 20);
  // 10° to 350° is -20°
  assert.equal(shortestAngleDistance(10, 350), -20);
  // Exact 180° difference
  assert.equal(Math.abs(shortestAngleDistance(0, 180)), 180);

  // Normalization
  assert.equal(normalizeHeading(365), 5);
  assert.equal(normalizeHeading(-10), 350);
  assert.equal(normalizeHeading(0), 0);
});

test('filters impossible coordinate jumps and GPS teleportation', () => {
  // Same coordinate -> always sensible
  assert.equal(isSensibleGpsJump(17.44, 78.37, 17.44, 78.37, 3000), true);
  // Realistic movement: 30 meters in 3 seconds = 36 km/h -> sensible
  assert.equal(isSensibleGpsJump(17.4400, 78.3700, 17.4402, 78.3700, 3000, 150), true);
  // Impossible jump: 5 km in 2 seconds (9000 km/h) -> rejected
  assert.equal(isSensibleGpsJump(17.44, 78.37, 17.49, 78.37, 2000, 150), false);
});

test('filters heading jitter when stationary', () => {
  // 2 degree drift while speed is 0 -> should retain previous heading
  assert.equal(filterHeadingJitter(45, 47, 0, 3), 45);
  // 10 degree turn while moving (15 km/h) -> should accept new heading
  assert.equal(filterHeadingJitter(45, 55, 15, 3), 55);
});
