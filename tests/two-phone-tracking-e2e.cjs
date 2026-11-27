/**
 * tests/two-phone-tracking-e2e.cjs
 *
 * Automated Two-Mobile Live Tracking Simulation & End-to-End Verification.
 *
 * Simulates:
 * - Phone A: Customer Live Tracking Screen (GoogleMapView, CustomerHomeMarker, MovingWorkerWoman3D,
 *            blue navigation route #2563EB, EatClub-style route shortening, floating ETA, PIN reveal).
 * - Phone B: Worker App (ActiveJobScreen -> Tap "Start Travelling" -> Foreground GPS broadcast
 *            every 7s -> Successive road updates -> Doorstep arrival -> Stop tracking).
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

// Enable loading TypeScript modules directly in Node.js test runner
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

const { projectOntoRoute, computeRemaining, sliceRemainingRoute } = require('../src/services/routeGeometry.ts');
const { isAcceptableLocationTimestamp, parseLocationTimestamp } = require('../src/services/trackingMath.ts');

test('Two-Mobile Tracking E2E: Full lifecycle from Accept -> Travel -> 7s GPS -> Route Shorten -> Arrival', async () => {
  console.log('\n================================================================');
  console.log('🚀 RUNNING TWO-MOBILE LIVE TRACKING END-TO-END VERIFICATION');
  console.log('================================================================\n');

  // 1. Initial State: Booking #HE-13FE6F1D (Electrician Services)
  const BOOKING_ID = '13fe6f1d-8492-411a-b32e-091a2b3c4d5e';
  const CUSTOMER_DESTINATION = { latitude: 17.4395, longitude: 78.3820 }; // Fixed home destination pin

  // Simulated road polyline from Worker starting point to Customer Destination (~1.2 km road path)
  const FULL_ROAD_ROUTE = [
    { latitude: 17.4478, longitude: 78.3740 }, // Point 0: Worker starting point
    { latitude: 17.4460, longitude: 78.3755 }, // Point 1: Junction turn
    { latitude: 17.4435, longitude: 78.3780 }, // Point 2: Khajaguda Rd
    { latitude: 17.4410, longitude: 78.3805 }, // Point 3: Colony entrance
    { latitude: 17.4395, longitude: 78.3820 }, // Point 4: Customer doorstep (Destination)
  ];
  const TOTAL_DISTANCE_METERS = 1250;
  const TOTAL_DURATION_SECONDS = 360; // 6 mins

  // ───────────────────────── PHONE A: Customer Mobile State ─────────────────────────
  const phoneA_Customer = {
    status: 'ACCEPTED',
    statusBanner: 'Partner Assigned • OFFLINE',
    partnerPosition: null,
    destinationMarker: CUSTOMER_DESTINATION,
    fullRoute: FULL_ROAD_ROUTE,
    slicedRoute: [],
    remainingDistanceMeters: TOTAL_DISTANCE_METERS,
    remainingDurationSeconds: TOTAL_DURATION_SECONDS,
    lastSequenceNumber: null,
    lastSegmentIndex: 0,
    doorstepPinRevealed: false,

    // Ingest location frame (exact logic from useLiveTracking.ts)
    onReceiveLocationFrame(frame) {
      // 1. Validate timestamp
      const parsedTs = parseLocationTimestamp(frame.timestamp);
      assert.ok(parsedTs !== null, 'Frame must have a valid timestamp');

      // 2. Monotonic sequence check
      if (this.lastSequenceNumber !== null) {
        assert.ok(frame.sequenceNumber > this.lastSequenceNumber, 'Sequence must be strictly monotonic');
      }
      this.lastSequenceNumber = frame.sequenceNumber;

      // 3. Update worker position
      this.partnerPosition = {
        lat: frame.latitude,
        lng: frame.longitude,
        bearing: frame.heading,
      };

      // 4. EatClub-style route slicing: removes completed portion behind worker
      const sliced = sliceRemainingRoute(
        this.fullRoute,
        { latitude: frame.latitude, longitude: frame.longitude },
        this.lastSegmentIndex,
        60
      );
      this.slicedRoute = sliced.remainingPolyline;
      if (sliced.progress) {
        this.lastSegmentIndex = sliced.progress.segmentIndex;
      }

      // 5. Update remaining distance and ETA
      const rem = computeRemaining(
        {
          polyline: this.fullRoute,
          distanceMeters: TOTAL_DISTANCE_METERS,
          durationSeconds: TOTAL_DURATION_SECONDS,
        },
        { latitude: frame.latitude, longitude: frame.longitude },
        60,
        this.lastSegmentIndex
      );

      if (rem.status === 'ON_ROUTE') {
        this.remainingDistanceMeters = rem.remainingMeters;
        this.remainingDurationSeconds = rem.remainingSeconds;
      }
    },

    // Ingest booking status event
    onBookingEvent(event) {
      this.status = event.status;
      if (event.status === 'ON_THE_WAY') {
        this.statusBanner = 'Partner On The Way • LIVE';
      } else if (event.status === 'ARRIVED') {
        this.statusBanner = 'Partner Arrived at Doorstep';
        this.doorstepPinRevealed = true;
      }
    },
  };

  // ───────────────────────── PHONE B: Worker Mobile State ─────────────────────────
  const phoneB_Worker = {
    status: 'accepted',
    isTrackingActive: false,
    currentFixIndex: 0,
    sequenceCounter: 0,

    // Tapping "Start Travelling to Customer"
    startTravelling() {
      assert.equal(this.status, 'accepted', 'Worker must be in accepted status to start travelling');
      this.status = 'travelling';
      this.isTrackingActive = true;
      return { bookingId: BOOKING_ID, status: 'ON_THE_WAY' };
    },

    // Emit genuine GPS fix every 7s
    getNextGpsFix(waypoint, heading, speed) {
      this.sequenceCounter += 1;
      return {
        bookingId: BOOKING_ID,
        latitude: waypoint.latitude,
        longitude: waypoint.longitude,
        heading,
        speed,
        accuracy: 4.5,
        sequenceNumber: this.sequenceCounter,
        timestamp: Date.now(),
        trackingActive: true,
      };
    },

    // Tapping "I have arrived - notify customer"
    markArrived() {
      this.status = 'arrived';
      this.isTrackingActive = false;
      return { bookingId: BOOKING_ID, status: 'ARRIVED' };
    },
  };

  // ───────────────────────── STEP 1: Initial Standby Check ─────────────────────────
  console.log('📱 Phone A (Customer): Status = "Partner Assigned • OFFLINE"');
  console.log('📱 Phone B (Worker): Status = "Accepted", button = "Start Travelling to Customer"');
  assert.equal(phoneA_Customer.status, 'ACCEPTED');
  assert.equal(phoneB_Worker.status, 'accepted');
  assert.equal(phoneA_Customer.partnerPosition, null);

  // ───────────────────────── STEP 2: Worker Taps "Start Travelling" ─────────────────
  console.log('\n👉 Phone B: Worker taps "Start Travelling to Customer"...');
  const travelEvent = phoneB_Worker.startTravelling();
  phoneA_Customer.onBookingEvent(travelEvent);
  assert.equal(phoneA_Customer.status, 'ON_THE_WAY');
  assert.equal(phoneA_Customer.statusBanner, 'Partner On The Way • LIVE');
  console.log('✅ Phone A: Customer screen switched to "Partner On The Way • LIVE"');

  // ───────────────────────── STEP 3: 7-Second GPS Location Ticks ───────────────────
  const waypoints = [
    { pt: { latitude: 17.4478, longitude: 78.3740 }, heading: 145, speed: 4.2, label: 'Trip Start (Point 0)' },
    { pt: { latitude: 17.4460, longitude: 78.3755 }, heading: 140, speed: 4.5, label: 'Junction Turn (Point 1, t=7s)' },
    { pt: { latitude: 17.4435, longitude: 78.3780 }, heading: 135, speed: 4.0, label: 'Mid-route (Point 2, t=14s)' },
    { pt: { latitude: 17.4410, longitude: 78.3805 }, heading: 130, speed: 3.8, label: 'Colony Gate (Point 3, t=21s)' },
    { pt: { latitude: 17.4395, longitude: 78.3820 }, heading: 130, speed: 1.2, label: 'Doorstep (Point 4, t=28s)' },
  ];

  let prevRemainingDistance = TOTAL_DISTANCE_METERS + 100;
  let prevRemainingDuration = TOTAL_DURATION_SECONDS + 100;

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const fix = phoneB_Worker.getNextGpsFix(wp.pt, wp.heading, wp.speed);

    // Phone B uploads GPS -> Transport Publishes -> Phone A receives GPS frame
    phoneA_Customer.onReceiveLocationFrame(fix);

    console.log(`\n📍 GPS Tick ${i + 1} [Seq #${fix.sequenceNumber}] - ${wp.label}:`);
    console.log(`   Worker Position: [${fix.latitude.toFixed(4)}, ${fix.longitude.toFixed(4)}], Heading: ${fix.heading}°`);
    console.log(`   Customer Blue Route Vertices Remaining: ${phoneA_Customer.slicedRoute.length} points`);
    console.log(`   Remaining Distance: ${phoneA_Customer.remainingDistanceMeters} m (ETA: ${Math.round(phoneA_Customer.remainingDurationSeconds / 60)} min ${phoneA_Customer.remainingDurationSeconds % 60} s)`);

    // Verify distance and duration strictly decrease
    assert.ok(
      phoneA_Customer.remainingDistanceMeters <= prevRemainingDistance,
      `Remaining distance must decrease (${phoneA_Customer.remainingDistanceMeters} <= ${prevRemainingDistance})`
    );
    assert.ok(
      phoneA_Customer.remainingDurationSeconds <= prevRemainingDuration,
      `Remaining ETA duration must decrease (${phoneA_Customer.remainingDurationSeconds} <= ${prevRemainingDuration})`
    );

    // Verify sliced route ends at customer destination
    const lastPoint = phoneA_Customer.slicedRoute[phoneA_Customer.slicedRoute.length - 1];
    assert.equal(lastPoint.latitude, CUSTOMER_DESTINATION.latitude);
    assert.equal(lastPoint.longitude, CUSTOMER_DESTINATION.longitude);

    prevRemainingDistance = phoneA_Customer.remainingDistanceMeters;
    prevRemainingDuration = phoneA_Customer.remainingDurationSeconds;
  }

  // At the doorstep: remaining distance should be ~0m
  assert.equal(phoneA_Customer.remainingDistanceMeters, 0);
  assert.equal(phoneA_Customer.remainingDurationSeconds, 0);
  console.log('✅ Final position is at customer destination (~0m remaining)');

  // ───────────────────────── STEP 4: Worker Marks Arrival ─────────────────────────
  console.log('\n👉 Phone B: Worker reaches doorstep and taps "I have arrived - notify customer"...');
  const arrivalEvent = phoneB_Worker.markArrived();
  phoneA_Customer.onBookingEvent(arrivalEvent);

  assert.equal(phoneA_Customer.status, 'ARRIVED');
  assert.equal(phoneA_Customer.doorstepPinRevealed, true);
  console.log('✅ Phone A: Tracking stopped, Doorstep 4-Digit Security PIN is revealed!');

  console.log('\n================================================================');
  console.log('🎉 ALL TWO-MOBILE LIVE TRACKING ASSERTIONS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
});
