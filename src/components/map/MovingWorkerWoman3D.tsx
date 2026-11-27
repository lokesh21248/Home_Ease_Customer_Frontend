/**
 * HomeEase code-drawn walking female partner marker.
 * No PNG / JPG / image download. React Native SVG creates a dimensional 2.5D look.
 * Coordinates are from your existing authenticated real GPS tracking hook.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { AnimatedRegion, Marker } from 'react-native-maps';
import { WORKER_SYMBOL_WIDTH, WORKER_SYMBOL_HEIGHT, WORKER_MARKER_JITTER_METERS, smoothWorkerMotionDurationMs } from '../../services/workerMarkerMotion';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

export type WorkerFix = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  timestampMs?: number | null;
};

type Props = {
  worker: WorkerFix;
  /** Set to true only if this fix is confirmed fresh by your tracking hook. */
  isGpsStale?: boolean;
  name?: string;
  zIndex?: number;
  serviceCategory?: string;
  isLive?: boolean;
  statusLabel?: string;
};

const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

function distanceMetres(a: WorkerFix, b: WorkerFix): number {
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) *
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

/** Source-only vector art: simulated depth using SVG gradients and layered body shapes. */
export const WalkingWoman3D = memo(function WalkingWoman3D({ heading = 0 }: { heading?: number }) {
  return (
    <Svg width={WORKER_SYMBOL_WIDTH} height={WORKER_SYMBOL_HEIGHT} viewBox="0 0 48 58">
      <Defs>
        <LinearGradient id="shirt" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#133B93" />
          <Stop offset="0.48" stopColor="#3B82F6" />
          <Stop offset="1" stopColor="#0E387F" />
        </LinearGradient>
        <LinearGradient id="skin" x1="0" y1="0" x2="1" y2="0.25">
          <Stop offset="0" stopColor="#A96843" />
          <Stop offset="0.48" stopColor="#E7AB7A" />
          <Stop offset="1" stopColor="#B87551" />
        </LinearGradient>
        <LinearGradient id="trousers" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#111C3D" />
          <Stop offset="0.52" stopColor="#344D79" />
          <Stop offset="1" stopColor="#142341" />
        </LinearGradient>
        <LinearGradient id="hair" x1="0" y1="0" x2="1" y2="0.1">
          <Stop offset="0" stopColor="#151324" />
          <Stop offset="0.65" stopColor="#40302B" />
          <Stop offset="1" stopColor="#1C1821" />
        </LinearGradient>
      </Defs>

      {/* Compact circular worker map symbol, clear on both light and dark roads. */}
      <Path d="M24 55 L17 41 L31 41 Z" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="1.5" />
      <Circle cx="24" cy="23" r="21.5" fill="#FFFFFF" />
      <Circle cx="24" cy="23" r="19" fill="#DBEAFE" stroke="#1D4ED8" strokeWidth="2.5" />
      <G transform="translate(9 2) scale(0.31 0.34)">
      {/* Soft contact shadow; kept inside marker bounds */}
      <Ellipse cx="48" cy="124" rx="27" ry="8" fill="#0F172A" opacity="0.10" />
      <Ellipse cx="48" cy="124" rx="19" ry="5" fill="#0F172A" opacity="0.15" />

      {/* Ground-direction arrow rotates; person remains upright instead of tilting. */}
      <G transform={`rotate(${normalize(heading)} 48 124)`}>
        <Path d="M48 104 L42 118 L48 115 L54 118 Z" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.8" />
      </G>

      {/* Back leg and shoe: longer stride creates a walking pose */}
      <Path d="M48 76 L58 95 L70 109 L65 114 L52 105 L41 87 Z" fill="#172C52" />
      <Path d="M64 108 L74 111 Q78 115 73 119 L60 117 L60 112 Z" fill="#15233E" />
      <Path d="M61 116 L73 118" stroke="#C9D7F2" strokeWidth="2.3" strokeLinecap="round" />

      {/* Front leg */}
      <Path d="M40 76 L35 96 L28 112 L35 116 L43 103 L51 83 Z" fill="url(#trousers)" />
      <Path d="M26 109 L36 112 L38 119 Q36 122 32 122 L22 120 Q19 116 26 109 Z" fill="#14223B" />
      <Path d="M23 119 Q29 121 37 120" stroke="#D5E4FF" strokeWidth="2.4" strokeLinecap="round" />

      {/* Back arm with natural walk swing */}
      <Path d="M61 49 Q70 52 72 65 L77 76 Q76 81 71 81 L65 66 L58 58 Z" fill="#184AAB" />
      <Path d="M72 76 Q76 73 78 77 L78 83 Q75 88 71 83 Z" fill="url(#skin)" />

      {/* Small shoulder bag for a professional service worker */}
      <Path d="M34 53 Q26 59 27 80 L36 82 L40 61" fill="#253B62" />
      <Path d="M32 50 Q24 62 32 75" stroke="#DBEAFE" strokeWidth="2" fill="none" />

      {/* Body / tunic with 3D lighting */}
      <Path d="M38 45 Q47 42 59 47 L66 78 Q49 88 34 78 L33 59 Q33 51 38 45 Z" fill="url(#shirt)" />
      <Path d="M52 47 L57 76 Q61 76 65 78 L59 47 Z" fill="#0D2E74" opacity="0.45" />
      <Path d="M39 50 L40 77" stroke="#93C5FD" strokeWidth="1.8" opacity="0.7" />
      <Path d="M43 48 L49 55 L55 47" stroke="#DCEAFE" strokeWidth="2.5" fill="none" />
      <Circle cx="52" cy="62" r="3.2" fill="#FFFFFF" opacity="0.95" />
      <Path d="M50 62 L54 62" stroke="#2563EB" strokeWidth="1.1" />

      {/* Forward-swinging arm */}
      <Path d="M36 49 Q29 49 28 58 L23 76 Q23 80 28 81 Q35 71 38 59 Z" fill="#3478DE" />
      <Path d="M23 75 Q28 73 30 77 L28 85 Q25 89 22 84 Z" fill="url(#skin)" />

      {/* Neck */}
      <Path d="M44 42 L44 48 Q50 53 54 46 L53 40 Z" fill="url(#skin)" />

      {/* Hair and ponytail behind face */}
      <Path d="M39 26 Q35 17 43 14 Q56 10 61 23 L61 40 L55 43 L38 37 Z" fill="url(#hair)" />
      <Path d="M59 28 Q69 33 67 47 Q64 52 60 49 L59 37 Z" fill="#28212A" />
      <Path d="M61 45 Q69 48 63 52" stroke="#4C3440" strokeWidth="3" fill="none" />

      {/* Head, subtle cheek and directional nose */}
      <Path d="M39 25 Q43 17 52 19 Q61 22 60 32 Q59 42 50 44 Q41 43 39 34 Z" fill="url(#skin)" />
      <Path d="M39 26 Q42 16 52 18 Q58 19 60 25 Q55 24 51 21 Q46 29 39 30 Z" fill="url(#hair)" />
      <Path d="M59 31 L62 34 L58 36" fill="#B87551" />
      <Circle cx="54.8" cy="30.5" r="1.15" fill="#2E2629" />
      <Path d="M53 38 Q56 39 58 37" stroke="#9C534B" strokeWidth="1.3" fill="none" />
      <Path d="M43 37 Q46 41 51 41" stroke="#F5C89E" strokeWidth="1.1" fill="none" opacity="0.7" />
      </G>
    </Svg>
  );
});

/** Wrap in a Google MapView; never put another default worker Marker at the same point. */
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

  // Animated marker ref shape differs between react-native-maps versions.
  const markerRef = useRef<any>(null);
  const last = useRef<WorkerFix>(worker);
  const [snapshotUpdates, setSnapshotUpdates] = useState(true);

  const bearing =
    typeof worker.heading === 'number' && Number.isFinite(worker.heading)
      ? normalize(worker.heading)
      : 0;

  // Android snapshots JSX/SVG marker content. Refresh briefly when the direction changes.
  useEffect(() => {
    setSnapshotUpdates(true);
    const timeout = setTimeout(() => setSnapshotUpdates(false), 450);
    return () => clearTimeout(timeout);
  }, [bearing]);

  useEffect(() => {
    if (!validFix(worker) || !validFix(last.current) || isGpsStale) return;
    if (
      worker.timestampMs != null &&
      last.current.timestampMs != null &&
      worker.timestampMs <= last.current.timestampMs
    ) {
      return;
    }
    const metres = distanceMetres(last.current, worker);
    if (metres < WORKER_MARKER_JITTER_METERS) {
      last.current = worker;
      return; // Do not twitch when stationary.
    }
    const dt =
      (worker.timestampMs ?? Date.now()) -
      (last.current.timestampMs ?? Date.now() - 7000);
    const duration = smoothWorkerMotionDurationMs(dt);
    const next = { latitude: worker.latitude, longitude: worker.longitude };

    if (Platform.OS === 'android') {
      const nativeMarker = markerRef.current?._component ?? markerRef.current;
      if (nativeMarker?.animateMarkerToCoordinate) {
        nativeMarker.animateMarkerToCoordinate(next, duration);
      } else {
        // Keep animating when the Android marker instance has not exposed its
        // native animation method yet; only snap for the first valid fix.
        (animatedCoordinate as any)
          .timing({ ...next, latitudeDelta: 0, longitudeDelta: 0, duration, useNativeDriver: false })
          .start();
      }
    } else {
      (animatedCoordinate as any)
        .timing({ ...next, latitudeDelta: 0, longitudeDelta: 0, duration, useNativeDriver: false })
        .start();
    }
    last.current = worker;
  }, [worker.latitude, worker.longitude, worker.timestampMs, isGpsStale, animatedCoordinate]);

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
      <View collapsable={false} style={{ width: WORKER_SYMBOL_WIDTH, height: WORKER_SYMBOL_HEIGHT }}>
        <WalkingWoman3D heading={bearing} />
      </View>
    </AnimatedMarker>
  );
});

const AnimatedMarker = (Marker.Animated || Marker) as any;

export default MovingWorkerWoman3D;
