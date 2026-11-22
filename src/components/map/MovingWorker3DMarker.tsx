/**
 * MovingWorker3DMarker — Premium 3D-Style Service Professional Navigation Marker.
 *
 * Implements:
 * 1. Realistic perspective-shaded technician riding HomeEase blue electric scooter with helmet and contact ground shadow.
 * 2. High-resolution multi-density transparent PNG assets (1x, 2x, 3x, 4x).
 * 3. Exact 56x70 dp on-screen size (48–64 dp specification).
 * 4. Ground shadow anchor point at (0.51, 0.92) aligning the scooter wheels directly with the road polyline.
 * 5. Native Android Google Maps SDK 60fps coordinate animation (animateMarkerToCoordinate) and iOS AnimatedRegion.timing.
 * 6. Shortest-angle directional rotation with smooth cubic ease-out (seamless 359° <-> 1° transition).
 * 7. Anti-jitter stationary deadband (< 2m threshold) preventing twitching at traffic lights.
 * 8. Smart tracksViewChanges lifecycle: renders snapshot once on mount/load, then freezes to false for zero CPU overhead during GPS movement.
 */

import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { Platform, StyleSheet, View, Image, Text } from 'react-native';
import { AnimatedRegion, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { isValidCoordinate } from '../../services/coordinates';
import { categoryIcon } from '../../services/workerMarkerStyle';

export interface WorkerGPS {
  latitude: number;
  longitude: number;
  heading?: number | null;
  timestampMs?: number; // UNIX milliseconds or seconds
}

export interface MovingWorker3DMarkerProps {
  worker: WorkerGPS;
  staleAfterMs?: number;
  name?: string;
  zIndex?: number;
  /** Service category / name, shown as a trade icon on the badge (electrician, plumber, AC technician...). */
  serviceCategory?: string;
  /** "Live" vs. last-seen text on the badge (computed by the caller from fresh, connected data only). */
  statusLabel?: string;
  isLive?: boolean;
}

type Position = Pick<WorkerGPS, 'latitude' | 'longitude'>;

const normalize = (angle: number) => ((angle % 360) + 360) % 360;
const deg = Math.PI / 180;

function distanceMeters(a: Position, b: Position) {
  const lat = (b.latitude - a.latitude) * deg;
  const lng = (b.longitude - a.longitude) * deg;
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.latitude * deg) * Math.cos(b.latitude * deg) * Math.sin(lng / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function headingBetween(a: Position, b: Position) {
  const lon = (b.longitude - a.longitude) * deg;
  const y = Math.sin(lon) * Math.cos(b.latitude * deg);
  const x =
    Math.cos(a.latitude * deg) * Math.sin(b.latitude * deg) -
    Math.sin(a.latitude * deg) * Math.cos(b.latitude * deg) * Math.cos(lon);
  return normalize(Math.atan2(y, x) / deg);
}

const SCOOTER_ASSET = require('../../../assets/worker-scooter-3d.png');

export const MovingWorker3DMarker: React.FC<MovingWorker3DMarkerProps> = memo(function MovingWorker3DMarker({
  worker,
  name = 'Service Partner',
  zIndex = 999,
  staleAfterMs = 45_000,
  serviceCategory,
  statusLabel,
  isLive = false,
}) {
  const trade = categoryIcon(serviceCategory);
  const badgeRef = useRef<any>(null);
  // The badge is a SEPARATE, upright marker riding on the same animated coordinate: the vehicle rotates with the
  // GPS bearing, while the name / trade / live text stays readable. It re-snapshots only when its content changes.
  const [badgeTracks, setBadgeTracks] = useState(true);
  useEffect(() => {
    setBadgeTracks(true);
    const t = setTimeout(() => setBadgeTracks(false), 400);
    return () => clearTimeout(t);
  }, [name, trade.icon, statusLabel, isLive]);
  const animated = useRef(
    new AnimatedRegion({
      latitude: worker.latitude,
      longitude: worker.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;

  const markerRef = useRef<any>(null);
  const previous = useRef<WorkerGPS>(worker);
  const currentHeading = useRef(normalize(worker.heading ?? 0));
  const rotateFrame = useRef<number | null>(null);
  const [bearing, setBearing] = useState(currentHeading.current);

  // tracksViewChanges starts true so Android Google Maps SDK captures the child <Image> view snapshot,
  // then locks to false to ensure smooth 60fps native GPU translation without re-rasterizing.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const freezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const freezeTracking = useCallback(() => {
    if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
    freezeTimerRef.current = setTimeout(() => {
      setTracksViewChanges(false);
    }, 300);
  }, []);

  useEffect(() => {
    freezeTracking();
    return () => {
      if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
    };
  }, [freezeTracking]);

  // Shortest-angle smooth bearing rotation
  const smoothRotation = useCallback((target: number) => {
    if (rotateFrame.current != null) cancelAnimationFrame(rotateFrame.current);
    const startHeading = currentHeading.current;
    // Shortest angular difference: always between -180 and +180
    const delta = ((normalize(target) - startHeading + 540) % 360) - 180;
    const start = Date.now();
    const duration = 380; // ms transition

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - (1 - t) ** 3;
      currentHeading.current = normalize(startHeading + delta * eased);
      setBearing(currentHeading.current);
      if (t < 1) {
        rotateFrame.current = requestAnimationFrame(tick);
      } else {
        rotateFrame.current = null;
      }
    };
    rotateFrame.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (rotateFrame.current != null) cancelAnimationFrame(rotateFrame.current);
    };
  }, []);

  useEffect(() => {
    if (
      !Number.isFinite(worker.latitude) ||
      !Number.isFinite(worker.longitude) ||
      Math.abs(worker.latitude) > 90 ||
      Math.abs(worker.longitude) > 180
    ) {
      return;
    }

    const rawTs = worker.timestampMs;
    const currentTimestamp =
      typeof rawTs === 'number' && Number.isFinite(rawTs)
        ? rawTs < 1e12
          ? rawTs * 1000
          : rawTs
        : Date.now();

    // Do not animate ancient/stale location updates (> staleAfterMs)
    if (Date.now() - currentTimestamp > staleAfterMs) {
      return;
    }

    const last = previous.current;
    const next: Position = { latitude: worker.latitude, longitude: worker.longitude };
    const meters = distanceMeters(last, next);

    // Initial positioning if previous was uninitialized or invalid
    if (!isValidCoordinate(last.latitude, last.longitude)) {
      animated.setValue({ ...next, latitudeDelta: 0, longitudeDelta: 0 });
      previous.current = { ...worker, timestampMs: currentTimestamp };
      if (worker.heading !== undefined && worker.heading !== null && Number.isFinite(worker.heading)) {
        smoothRotation(worker.heading);
      }
      return;
    }

    // Anti-jitter: ignore micro-movements < 2m to prevent twitching when stationary at signals
    if (meters < 2) {
      previous.current = { ...worker, timestampMs: currentTimestamp };
      if (worker.heading !== undefined && worker.heading !== null && Number.isFinite(worker.heading)) {
        smoothRotation(worker.heading);
      }
      return;
    }

    const prevRawTs = last.timestampMs;
    const prevTimestamp =
      typeof prevRawTs === 'number' && Number.isFinite(prevRawTs)
        ? prevRawTs < 1e12
          ? prevRawTs * 1000
          : prevRawTs
        : currentTimestamp - 1000;

    const elapsed = Math.max(500, currentTimestamp - prevTimestamp);
    const duration = Math.max(450, Math.min(2500, elapsed * 0.75));

    // Animate smoothly if update is within realistic GPS reporting cadence (< 30s) and reasonable travel (< 300m)
    const canAnimate = elapsed < 30_000 && meters < 300;

    if (!canAnimate) {
      // Large jump: snap directly to coordinate without false flying animation
      animated.setValue({ ...next, latitudeDelta: 0, longitudeDelta: 0 });
    } else {
      if (Platform.OS === 'android' && markerRef.current?.animateMarkerToCoordinate) {
        // Native Android Google Maps SDK hardware-accelerated translation
        markerRef.current.animateMarkerToCoordinate(next, duration);
        badgeRef.current?.animateMarkerToCoordinate?.(next, duration);
      } else {
        // iOS AnimatedRegion timing
        (animated as any).timing({ ...next, duration, useNativeDriver: false }).start();
      }
    }

    const targetHeading =
      worker.heading !== undefined && worker.heading !== null && Number.isFinite(worker.heading)
        ? normalize(worker.heading)
        : headingBetween(last, next);

    smoothRotation(targetHeading);
    previous.current = { ...worker, timestampMs: currentTimestamp };
  }, [worker, animated, smoothRotation, staleAfterMs]);

  return (
    <>
    <AnimatedMarker
      ref={badgeRef}
      coordinate={animated}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={zIndex + 1}
      tracksViewChanges={badgeTracks}
      identifier="homeease-assigned-worker-badge"
    >
      <View style={styles.badgeWrap}>
        <View style={styles.badge}>
          <View style={[styles.tradeCircle, { backgroundColor: trade.color }]}>
            <Ionicons name={trade.icon as any} size={12} color="#FFFFFF" />
          </View>
          <Text style={styles.badgeName} numberOfLines={1}>
            {name}
          </Text>
          <View style={[styles.liveDot, { backgroundColor: isLive ? '#16A34A' : '#9CA3AF' }]} />
          <Text style={[styles.badgeStatus, { color: isLive ? '#16A34A' : '#6B7280' }]} numberOfLines={1}>
            {statusLabel || (isLive ? 'Live' : 'Offline')}
          </Text>
        </View>
        {/* transparent spacer so the badge sits above the vehicle instead of covering it */}
        <View style={styles.badgeSpacer} />
      </View>
    </AnimatedMarker>
    <AnimatedMarker
      ref={markerRef}
      coordinate={animated}
      anchor={{ x: 0.51, y: 0.92 }}
      rotation={bearing}
      flat={true}
      zIndex={zIndex}
      title={name}
      tracksViewChanges={tracksViewChanges}
      identifier="homeease-assigned-worker-scooter"
    >
      <View style={styles.markerContainer}>
        <Image
          source={SCOOTER_ASSET}
          style={styles.scooterImage}
          resizeMode="contain"
          fadeDuration={0}
          onLoadEnd={freezeTracking}
        />
      </View>
    </AnimatedMarker>
    </>
  );
});

const styles = StyleSheet.create({
  badgeWrap: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  tradeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    maxWidth: 110,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
    marginRight: 3,
  },
  badgeStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeSpacer: {
    height: 62,
    width: 1,
  },
  markerContainer: {
    width: 60,
    height: 75,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  scooterImage: {
    width: 60,
    height: 75,
  },
});

const AnimatedMarker = Marker.Animated as any;

export default MovingWorker3DMarker;
