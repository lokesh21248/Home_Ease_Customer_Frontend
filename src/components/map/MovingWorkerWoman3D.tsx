/**
 * HomeEase compact walking woman map marker.
 *
 * Original vector character — no copied Snabbit assets, no network images.
 * Native map coordinate motion follows only accepted backend GPS fixes;
 * leg/arm pose animation is decorative and stops when GPS is stale or idle.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { AnimatedRegion, Marker } from 'react-native-maps';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import {
  WORKER_SYMBOL_WIDTH,
  WORKER_SYMBOL_HEIGHT,
  WORKER_MARKER_JITTER_METERS,
  smoothWorkerMotionDurationMs,
} from '../../services/workerMarkerMotion';

export type WorkerFix = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  timestampMs?: number | null;
};

type Props = {
  worker: WorkerFix;
  isGpsStale?: boolean;
  name?: string;
  zIndex?: number;
  serviceCategory?: string;
  isLive?: boolean;
  statusLabel?: string;
};

const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const WALK_FRAME_MS = 320;

function distanceMetres(a: WorkerFix, b: WorkerFix): number {
  const lat = radians(b.latitude - a.latitude);
  const lng = radians(b.longitude - a.longitude);
  const h = Math.sin(lat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) *
    Math.sin(lng / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function validFix(fix: WorkerFix): boolean {
  return (
    Number.isFinite(fix.latitude) &&
    Number.isFinite(fix.longitude) &&
    Math.abs(fix.latitude) <= 90 &&
    Math.abs(fix.longitude) <= 180
  );
}

/**
 * Full-body small female partner walking on the road — not a circular profile picture.
 * 4 alternating gait phases move arms, legs and hair gently while the native marker
 * position animates independently toward successive real GPS fixes.
 */
export const WalkingWoman3D = memo(function WalkingWoman3D({
  heading = 0,
  walkPhase = 0,
}: {
  heading?: number;
  walkPhase?: number;
}) {
  const stride = [0, -6, 0, 6][Math.abs(walkPhase) % 4];
  const bob = walkPhase === 1 || walkPhase === 3 ? -1 : 0;
  const leftFootX = 19 + stride;
  const rightFootX = 29 - stride;
  return (
    <Svg width={WORKER_SYMBOL_WIDTH} height={WORKER_SYMBOL_HEIGHT} viewBox="0 0 48 76">
      {/* Ground contact keeps the figure anchored to the GPS coordinate. */}
      <Ellipse cx="24" cy="71" rx="13" ry="3" fill="#0F172A" opacity={0.17} />
      <G transform={'translate(0 ' + bob + ')'}>
        {/* Back leg, opposite to the front leg in each stride. */}
        <Path
          d={'M29 45 Q' + (31 - stride * 0.3) + ' 57 ' + rightFootX + ' 66'}
          fill="none" stroke="#233757" strokeWidth={7}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <Path d={'M' + (rightFootX - 1) + ' 66 L' + (rightFootX + 5) + ' 67'}
          stroke="#17243D" strokeWidth={4} strokeLinecap="round" />

        {/* The swinging arm behind the uniform. */}
        <Path d={'M30 30 Q' + (37 + stride * 0.3) + ' 39 ' + (35 + stride * 0.45) + ' 46'}
          fill="none" stroke="#D49A72" strokeWidth={5}
          strokeLinecap="round" />

        {/* Front leg and shoe. */}
        <Path
          d={'M20 45 Q' + (17 + stride * 0.3) + ' 57 ' + leftFootX + ' 66'}
          fill="none" stroke="#152B52" strokeWidth={7.5}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <Path d={'M' + (leftFootX - 2) + ' 66 L' + (leftFootX + 4) + ' 67'}
          stroke="#0C1B34" strokeWidth={4.5} strokeLinecap="round" />

        {/* Ponytail behind head is a readable female silhouette even at 36px. */}
        <Path d="M30 12 Q40 14 36 27 Q35 33 31 30 L28 19 Z"
          fill="#271E29" stroke="#FFFFFF" strokeWidth={1} />
        <Path d="M17 10 Q20 2 28 5 Q36 7 34 18 L32 27 L16 22 Z"
          fill="#31232B" stroke="#FFFFFF" strokeWidth={1} />

        {/* Blue HomeEase uniform with contrast outline. */}
        <Path d="M18 28 Q24 24 31 28 L34 46 Q24 50 15 46 L16 33 Z"
          fill="#2563EB" stroke="#FFFFFF" strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M20 30 L22 44" stroke="#BFDBFE" strokeWidth={1.6} opacity={0.9} />
        <Path d="M29 29 L32 44" stroke="#1D4ED8" strokeWidth={2} opacity={0.9} />
        <Path d="M20 28 L24 33 L28 28" stroke="#F8FAFC" strokeWidth={1.8} fill="none" />

        {/* Other arm moves in the reverse direction to the legs. */}
        <Path d={'M18 30 Q' + (11 - stride * 0.3) + ' 39 ' + (13 - stride * 0.45) + ' 46'}
          fill="none" stroke="#D49A72" strokeWidth={5}
          strokeLinecap="round" />

        {/* Neck, face and long hair frame. */}
        <Path d="M22 24 L22 29 L27 29 L27 24" fill="#BE805A" />
        <Circle cx="24" cy="17" r="8.2" fill="#DCA177"
          stroke="#FFFFFF" strokeWidth={1.4} />
        <Path d="M16 17 Q15 6 25 7 Q34 7 32 16 Q29 12 26 11 Q22 17 16 17"
          fill="#2B2029" />
        <Path d="M31 16 Q35 22 31 29" stroke="#31232B"
          strokeWidth={3.5} strokeLinecap="round" fill="none" />
        <Circle cx="27.7" cy="17.5" r={0.85} fill="#2E2329" />
      </G>
      {/* Small directional pointer; the woman remains upright. */}
      <G transform={'rotate(' + normalize(heading) + ' 24 72)'}>
        <Path d="M24 67 L21 73 L24 71 L27 73 Z"
          fill="#2563EB" stroke="#FFFFFF" strokeWidth={1.2} />
      </G>
    </Svg>
  );
});

/**
 * A single map marker: native GPS coordinate animation + lightweight walking pose.
 * Android custom markers are briefly resnapshotted for each new pose, rather than
 * holding tracksViewChanges=true continuously at a high frame rate.
 */
export const MovingWorkerWoman3D = memo(function MovingWorkerWoman3D({
  worker,
  isGpsStale = false,
  zIndex = 100,
}: Props) {
  const animatedCoordinate = useRef(
    new AnimatedRegion({
      latitude: worker.latitude,
      longitude: worker.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;
  const markerRef = useRef<any>(null);
  const last = useRef<WorkerFix>(worker);
  const stopWalkingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [walking, setWalking] = useState(false);
  const [walkPhase, setWalkPhase] = useState(0);
  const [snapshotUpdates, setSnapshotUpdates] = useState(true);

  const bearing =
    typeof worker.heading === 'number' && Number.isFinite(worker.heading)
      ? normalize(worker.heading)
      : 0;

  // Change walking pose only while a genuine GPS transition is being animated.
  useEffect(() => {
    if (!walking || isGpsStale) {
      setWalkPhase(0);
      return;
    }
    const cadence = setInterval(() => setWalkPhase(p => (p + 1) % 4), WALK_FRAME_MS);
    return () => clearInterval(cadence);
  }, [walking, isGpsStale]);

  // An Android SVG marker is a bitmap snapshot. Resnapshot briefly per pose;
  // this avoids the high CPU cost of continuous tracksViewChanges.
  useEffect(() => {
    setSnapshotUpdates(true);
    const timer = setTimeout(() => setSnapshotUpdates(false), 170);
    return () => clearTimeout(timer);
  }, [walkPhase, bearing]);

  useEffect(() => {
    if (!validFix(worker) || !validFix(last.current) || isGpsStale) {
      if (isGpsStale) setWalking(false);
      return;
    }
    if (worker.timestampMs != null && last.current.timestampMs != null &&
        worker.timestampMs <= last.current.timestampMs) {
      return;
    }
    const metres = distanceMetres(last.current, worker);
    if (metres < WORKER_MARKER_JITTER_METERS) {
      // Real stationary fixes should not trigger fake steps.
      last.current = worker;
      if (stopWalkingRef.current) clearTimeout(stopWalkingRef.current);
      setWalking(false);
      return;
    }
    const gap =
      worker.timestampMs != null && last.current.timestampMs != null
        ? worker.timestampMs - last.current.timestampMs
        : undefined;
    const duration = smoothWorkerMotionDurationMs(gap);
    const next = { latitude: worker.latitude, longitude: worker.longitude };
    if (Platform.OS === 'android') {
      const nativeMarker = markerRef.current?._component ?? markerRef.current;
      if (nativeMarker?.animateMarkerToCoordinate) {
        nativeMarker.animateMarkerToCoordinate(next, duration);
      } else {
        (animatedCoordinate as any)
          .timing({ ...next, latitudeDelta: 0, longitudeDelta: 0,
            duration, useNativeDriver: false }).start();
      }
    } else {
      (animatedCoordinate as any)
        .timing({ ...next, latitudeDelta: 0, longitudeDelta: 0,
          duration, useNativeDriver: false }).start();
    }
    last.current = worker;
    setWalking(true);
    if (stopWalkingRef.current) clearTimeout(stopWalkingRef.current);
    stopWalkingRef.current = setTimeout(() => setWalking(false), duration);
  }, [worker.latitude, worker.longitude, worker.timestampMs, isGpsStale, animatedCoordinate]);

  useEffect(() => () => {
    if (stopWalkingRef.current) clearTimeout(stopWalkingRef.current);
  }, []);

  if (!validFix(worker)) return null;

  return (
    <AnimatedMarker
      ref={markerRef}
      coordinate={animatedCoordinate}
      anchor={{ x: 0.5, y: 0.97 }}
      flat={false}
      tracksViewChanges={snapshotUpdates}
      zIndex={zIndex}
      identifier="homeease-walking-partner"
    >
      <View collapsable={false}
        style={{ width: WORKER_SYMBOL_WIDTH, height: WORKER_SYMBOL_HEIGHT }}>
        <WalkingWoman3D heading={bearing} walkPhase={walkPhase} />
      </View>
    </AnimatedMarker>
  );
});

const AnimatedMarker = (Marker.Animated || Marker) as any;

export default MovingWorkerWoman3D;
