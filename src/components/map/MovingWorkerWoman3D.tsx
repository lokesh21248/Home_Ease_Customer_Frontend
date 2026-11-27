/**
 * HomeEase — Code-drawn animated walking female service-worker marker.
 *
 * Design goals:
 *  • Pure SVG art — no PNG/JPG/Lottie/remote URL.
 *  • 8-phase gait cycle driven by RN core Animated (safe inside Maps snapshot).
 *  • State machine: IDLE | WALKING | GPS_PAUSED | ARRIVED | COMPLETED.
 *  • AnimatedRegion + animateMarkerToCoordinate for smooth GPS interpolation.
 *  • tracksViewChanges=true only briefly when appearance changes (performance).
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { AnimatedRegion, Marker } from 'react-native-maps';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

// ─────────────────────────── Types ───────────────────────────────────────────

export type WorkerFix = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  timestampMs?: number | null;
};

type MarkerState = 'IDLE' | 'WALKING' | 'GPS_PAUSED' | 'ARRIVED' | 'COMPLETED';

type Props = {
  worker: WorkerFix;
  /** True when the GPS fix is older than GPS_STALE_MS (usually 30 s). */
  isGpsStale?: boolean;
  name?: string;
  zIndex?: number;
  serviceCategory?: string;
  isLive?: boolean;
  statusLabel?: string;
};

// ─────────────────────────── Maths ───────────────────────────────────────────

const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

function distanceMetres(a: WorkerFix, b: WorkerFix): number {
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function validFix(w: WorkerFix): boolean {
  return (
    Number.isFinite(w.latitude) &&
    Number.isFinite(w.longitude) &&
    Math.abs(w.latitude) <= 90 &&
    Math.abs(w.longitude) <= 180
  );
}

// ─────────────────────── Gait helpers ────────────────────────────────────────

/**
 * Map a gait phase 0–1 to the 8 discrete poses.
 * Returns per-limb rotation angles in degrees (sine-wave based).
 */
function computeGaitPose(phase: number) {
  // phase ∈ [0, 1). sin(2π·phase) gives smooth oscillation.
  const theta = phase * 2 * Math.PI;
  const leftLeg  = Math.sin(theta) * 25;        // ±25°
  const rightLeg = -leftLeg;                     // opposite
  const leftArm  = -Math.sin(theta) * 15;        // ±15°, opposite to left leg
  const rightArm = Math.sin(theta) * 15;
  const bodyBounce = Math.abs(Math.sin(theta)) * 1.5; // 0–1.5 dp downward
  const ponytailSwing = Math.sin(theta + 0.3) * 8;    // ±8°, slight lag
  const backpackBounce = Math.abs(Math.sin(theta)) * 2; // 0–2 dp down
  return { leftLeg, rightLeg, leftArm, rightArm, bodyBounce, ponytailSwing, backpackBounce };
}

// ─────────────────────── SVG character ───────────────────────────────────────

/**
 * Animated SVG walking woman — 32 × 50 dp rendered, viewBox 68 104.
 * Body parts are <G> elements whose transform is driven by Animated.Value.
 */
const WalkingWoman3D = memo(function WalkingWoman3D({
  heading = 0,
  gaitPhase,         // Animated.Value 0→1 looping
  markerState,
}: {
  heading?: number;
  gaitPhase: Animated.Value;
  markerState: MarkerState;
}) {
  // Derive per-limb animated strings from the shared gaitPhase value.
  // We use Animated.diffClamp + interpolate so each part gets its own range.

  const isAnimating = markerState === 'WALKING';

  // For SVG inside react-native-maps markers we cannot use AnimatedComponent
  // wrappers on SVG nodes (they don't re-render inside snapshot). Instead we
  // read the phase as a JS-driven value and use `useNativeDriver: false`.
  // We animate a plain JS state variable (poseIndex) on each frame tick.
  // This keeps the render simple and reliable across all Android API levels.

  const [pose, setPose] = useState(() => computeGaitPose(0));

  useEffect(() => {
    if (!isAnimating) {
      setPose(computeGaitPose(0));
      return;
    }
    // Listen to phase changes and update pose state (JS thread only).
    const id = gaitPhase.addListener(({ value }) => {
      setPose(computeGaitPose(value));
    });
    return () => gaitPhase.removeListener(id);
  }, [isAnimating, gaitPhase]);

  const { leftLeg, rightLeg, leftArm, rightArm, bodyBounce, ponytailSwing, backpackBounce } = pose;

  // Opacity: dim when stale / paused
  const opacity = markerState === 'GPS_PAUSED' ? 0.55 : 1;

  return (
    <Svg width={32} height={50} viewBox="0 0 68 104" style={{ opacity }}>
      <Defs>
        <LinearGradient id="ww3d-shirt" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#133B93" />
          <Stop offset="0.48" stopColor="#2563EB" />
          <Stop offset="1" stopColor="#0E387F" />
        </LinearGradient>
        <LinearGradient id="ww3d-skin" x1="0" y1="0" x2="1" y2="0.25">
          <Stop offset="0" stopColor="#A96843" />
          <Stop offset="0.48" stopColor="#E7AB7A" />
          <Stop offset="1" stopColor="#B87551" />
        </LinearGradient>
        <LinearGradient id="ww3d-trousers" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#111C3D" />
          <Stop offset="0.52" stopColor="#344D79" />
          <Stop offset="1" stopColor="#142341" />
        </LinearGradient>
        <LinearGradient id="ww3d-hair" x1="0" y1="0" x2="1" y2="0.1">
          <Stop offset="0" stopColor="#151324" />
          <Stop offset="0.65" stopColor="#40302B" />
          <Stop offset="1" stopColor="#1C1821" />
        </LinearGradient>
      </Defs>

      {/* ── Contact shadow ── */}
      <Ellipse cx="34" cy="97" rx="18" ry="4" fill="#0F172A" opacity={0.1} />
      <Ellipse cx="34" cy="97" rx="12" ry="2.5" fill="#0F172A" opacity={0.15} />

      {/* ── Ground-direction arrow (rotates with heading; person stays upright) ── */}
      <G transform={`rotate(${normalize(heading)} 34 97)`}>
        <Path d="M34 85 L29 95 L34 92 L39 95 Z" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.2" />
      </G>

      {/* ── Back leg (behind body) ── */}
      <G transform={`rotate(${rightLeg} 34 ${62 + bodyBounce})`}>
        {/* thigh + shin */}
        <Path d="M34 62 L40 78 L44 90 L39 92 L33 78 L28 64 Z" fill="#172C52" />
        {/* shoe */}
        <Path d="M38 89 L46 91 Q49 94 46 97 L35 96 L35 92 Z" fill="#14223B" />
        <Path d="M36 95 L45 96" stroke="#C9D7F2" strokeWidth="1.5" strokeLinecap="round" />
      </G>

      {/* ── Front leg ── */}
      <G transform={`rotate(${leftLeg} 34 ${62 + bodyBounce})`}>
        <Path d="M34 62 L28 78 L23 90 L28 92 L35 79 L40 64 Z" fill="url(#ww3d-trousers)" />
        {/* shoe */}
        <Path d="M21 89 L30 91 Q32 95 30 97 L19 96 Q17 93 21 89 Z" fill="#14223B" />
        <Path d="M19 95 Q24 97 30 96" stroke="#D5E4FF" strokeWidth="1.5" strokeLinecap="round" />
      </G>

      {/* ── Back arm ── */}
      <G transform={`rotate(${rightArm} 44 47)`}>
        <Path d="M44 47 Q52 50 54 61 L57 70 Q56 74 52 73 L49 59 L43 51 Z" fill="#184AAB" />
        {/* hand */}
        <Path d="M54 69 Q57 67 58 71 L57 76 Q55 79 52 75 Z" fill="url(#ww3d-skin)" />
      </G>

      {/* ── Backpack ── */}
      <G transform={`translate(0 ${backpackBounce})`}>
        <Path d="M28 42 Q21 48 22 65 L29 67 L33 49" fill="#253B62" />
        <Path d="M26 40 Q19 51 26 62" stroke="#DBEAFE" strokeWidth="1.5" fill="none" />
      </G>

      {/* ── Body / polo shirt ── */}
      <G transform={`translate(0 ${bodyBounce})`}>
        <Path d="M28 38 Q34 35 46 39 L51 64 Q37 72 25 63 L24 48 Q24 42 28 38 Z" fill="url(#ww3d-shirt)" />
        {/* shadow on shirt right */}
        <Path d="M40 39 L44 62 Q47 62 50 64 L46 39 Z" fill="#0D2E74" opacity={0.4} />
        {/* collar highlight */}
        <Path d="M30 43 L31 62" stroke="#93C5FD" strokeWidth="1.3" opacity={0.7} />
        {/* collar V */}
        <Path d="M30 42 L35 48 L41 41" stroke="#DCEAFE" strokeWidth="1.8" fill="none" />
        {/* house logo — tiny white house on chest */}
        <Path d="M35 54 L33 57 L33 60 L38 60 L38 57 Z" fill="#FFFFFF" opacity={0.9} />
        <Path d="M32 57 L35.5 53.5 L39 57" stroke="#FFFFFF" strokeWidth="1" fill="none" strokeLinecap="round" />
        <Path d="M35 57 L35 60" stroke="#2563EB" strokeWidth="0.8" />
      </G>

      {/* ── Front arm ── */}
      <G transform={`rotate(${leftArm} 26 47)`}>
        <Path d="M26 47 Q19 47 18 55 L14 70 Q14 74 19 74 Q25 65 28 54 Z" fill="#3478DE" />
        {/* hand */}
        <Path d="M14 69 Q18 67 20 71 L18 78 Q15 81 13 76 Z" fill="url(#ww3d-skin)" />
      </G>

      {/* ── Neck ── */}
      <Path d="M31 36 L31 41 Q35 45 39 40 L38 35 Z" fill="url(#ww3d-skin)" />

      {/* ── Hair behind face ── */}
      <Path d="M28 23 Q25 14 32 11 Q44 7 48 18 L49 33 L44 36 L27 31 Z" fill="url(#ww3d-hair)" />

      {/* ── Ponytail (animated swing) ── */}
      <G transform={`rotate(${ponytailSwing} 46 29)`}>
        <Path d="M46 24 Q54 28 52 39 Q50 43 47 41 L46 30 Z" fill="#28212A" />
        <Path d="M48 38 Q54 40 50 43" stroke="#4C3440" strokeWidth="2" fill="none" />
      </G>

      {/* ── Face ── */}
      <Path d="M28 22 Q32 14 40 16 Q48 18 48 27 Q47 36 39 37 Q30 36 28 27 Z" fill="url(#ww3d-skin)" />
      {/* fringe */}
      <Path d="M28 23 Q31 13 40 15 Q46 16 48 22 Q43 21 39 18 Q34 24 28 25 Z" fill="url(#ww3d-hair)" />
      {/* nose */}
      <Path d="M47 26 L49 28 L46 30" fill="#B87551" />
      {/* eye */}
      <Circle cx="43" cy="25" r="0.9" fill="#2E2629" />
      {/* smile */}
      <Path d="M42 32 Q44 33 46 31" stroke="#9C534B" strokeWidth="1" fill="none" />
      {/* cheek highlight */}
      <Path d="M31 31 Q34 34 39 34" stroke="#F5C89E" strokeWidth="0.9" fill="none" opacity={0.7} />
    </Svg>
  );
});

// ─────────────────────── Main marker component ───────────────────────────────

const GAIT_PERIOD_MS = 800;

/** Drop-in GPS marker. Never place another worker Marker at the same coordinate. */
export const MovingWorkerWoman3D = memo(function MovingWorkerWoman3D({
  worker,
  isGpsStale = false,
  zIndex = 100,
  statusLabel,
  isLive,
}: Props) {
  // ── GPS interpolation ──────────────────────────────────────────────────────
  const animatedCoordinate = useRef(
    new AnimatedRegion({
      latitude: worker.latitude,
      longitude: worker.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;
  const markerRef = useRef<any>(null);
  const lastFix = useRef<WorkerFix>(worker);

  // ── Gait animation ─────────────────────────────────────────────────────────
  const gaitPhase = useRef(new Animated.Value(0)).current;
  const gaitLoop  = useRef<Animated.CompositeAnimation | null>(null);

  // ── State machine ──────────────────────────────────────────────────────────
  const [markerState, setMarkerState] = useState<MarkerState>('IDLE');

  // ── tracksViewChanges ──────────────────────────────────────────────────────
  const [snapshotUpdates, setSnapshotUpdates] = useState(true);
  const snapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSnapshot = () => {
    setSnapshotUpdates(true);
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = setTimeout(() => setSnapshotUpdates(false), 450);
  };

  const bearing =
    typeof worker.heading === 'number' && Number.isFinite(worker.heading)
      ? normalize(worker.heading)
      : 0;

  // Refresh snapshot whenever heading changes.
  useEffect(() => {
    refreshSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bearing]);

  // ── GPS movement → state machine + map animation ───────────────────────────
  useEffect(() => {
    if (!validFix(worker) || !validFix(lastFix.current)) return;

    // Monotonic check — reject out-of-order frames.
    if (
      worker.timestampMs != null &&
      lastFix.current.timestampMs != null &&
      worker.timestampMs <= lastFix.current.timestampMs
    ) {
      return;
    }

    // Decide state.
    if (isGpsStale) {
      setMarkerState('GPS_PAUSED');
      lastFix.current = worker;
      return;
    }

    const isArrived =
      statusLabel === 'ARRIVED' || statusLabel === 'COMPLETED' || isLive === false;
    if (isArrived) {
      setMarkerState(statusLabel === 'COMPLETED' ? 'COMPLETED' : 'ARRIVED');
      lastFix.current = worker;
      return;
    }

    const metres = distanceMetres(lastFix.current, worker);
    if (metres < 2) {
      setMarkerState('IDLE');
      lastFix.current = worker;
      return;
    }

    // Worker is moving.
    setMarkerState('WALKING');

    // Map marker interpolation.
    const dt =
      (worker.timestampMs ?? Date.now()) -
      (lastFix.current.timestampMs ?? Date.now() - 7000);
    const duration = Math.max(700, Math.min(6000, dt > 0 ? dt * 0.8 : 5500));
    const next = { latitude: worker.latitude, longitude: worker.longitude };

    if (Platform.OS === 'android') {
      const nativeMarker = markerRef.current?._component ?? markerRef.current;
      if (nativeMarker?.animateMarkerToCoordinate) {
        nativeMarker.animateMarkerToCoordinate(next, duration);
      } else {
        animatedCoordinate.setValue({ ...next, latitudeDelta: 0, longitudeDelta: 0 });
      }
    } else {
      (animatedCoordinate as any)
        .timing({ ...next, latitudeDelta: 0, longitudeDelta: 0, duration, useNativeDriver: false })
        .start();
    }

    lastFix.current = worker;
    refreshSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker.latitude, worker.longitude, worker.timestampMs, isGpsStale, statusLabel, isLive]);

  // ── Drive gait loop from state ─────────────────────────────────────────────
  useEffect(() => {
    if (markerState === 'WALKING') {
      // Start continuous loop.
      gaitPhase.setValue(0);
      gaitLoop.current = Animated.loop(
        Animated.timing(gaitPhase, {
          toValue: 1,
          duration: GAIT_PERIOD_MS,
          easing: Easing.linear,
          useNativeDriver: false, // Must be false — listener reads value on JS thread.
        }),
      );
      gaitLoop.current.start();
    } else {
      // Stop loop, reset to upright pose.
      gaitLoop.current?.stop();
      gaitLoop.current = null;
      Animated.timing(gaitPhase, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
    // Refresh snapshot when pose/state changes.
    refreshSnapshot();
    return () => {
      gaitLoop.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerState]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      gaitLoop.current?.stop();
      if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    };
  }, []);

  if (!validFix(worker)) return null;

  return (
    <AnimatedMarker
      ref={markerRef}
      coordinate={animatedCoordinate}
      anchor={{ x: 0.5, y: 0.9 }}
      flat={false}
      tracksViewChanges={snapshotUpdates}
      zIndex={zIndex}
      identifier="homeease-walking-partner"
    >
      <View collapsable={false} style={{ width: 32, height: 50 }}>
        <WalkingWoman3D
          heading={bearing}
          gaitPhase={gaitPhase}
          markerState={markerState}
        />
      </View>
    </AnimatedMarker>
  );
});

const AnimatedMarker = (Marker.Animated || Marker) as any;

export default MovingWorkerWoman3D;
