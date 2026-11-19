import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { AnimatedRegion, Marker } from 'react-native-maps';
import { isValidCoordinate } from '../../services/coordinates';

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

/**
 * MovingWorker3DMarker — Native-rendered 3D-style worker on scooter.
 *
 * Uses transparent pre-rendered multi-density PNG with:
 * - Helmeted professional technician
 * - HomeEase signature blue scooter chassis
 * - Layered ambient and contact ground shadows
 * - Hardware-accelerated native marker rendering (avoids Android custom view snapshotting bugs)
 * - Native smooth coordinate animation & shortest-angle bearing rotation
 * - Zero extra layers or duplicate markers: 100% native image performance on Android & iOS
 */
export const MovingWorker3DMarker: React.FC<MovingWorker3DMarkerProps> = ({
  worker,
  name = 'Service Partner',
  zIndex = 999,
}) => {
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

  const smoothRotation = useCallback((target: number) => {
    if (rotateFrame.current != null) cancelAnimationFrame(rotateFrame.current);
    const startHeading = currentHeading.current;
    const delta = ((normalize(target) - startHeading + 540) % 360) - 180;
    const start = Date.now();

    const tick = () => {
      const t = Math.min((Date.now() - start) / 450, 1);
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

    const last = previous.current;
    const next: Position = { latitude: worker.latitude, longitude: worker.longitude };
    const meters = distanceMeters(last, next);

    // Initial positioning if previous was 0 or invalid
    if (!isValidCoordinate(last.latitude, last.longitude)) {
      animated.setValue({ ...next, latitudeDelta: 0, longitudeDelta: 0 });
      previous.current = { ...worker, timestampMs: currentTimestamp };
      if (worker.heading !== undefined && worker.heading !== null && Number.isFinite(worker.heading)) {
        smoothRotation(worker.heading);
      }
      return;
    }

    // Anti-jitter: ignore micro-movements < 2m to prevent twitching when stationary
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
    // Animate smoothly if update is within realistic GPS reporting cadence (< 30s) and distance (< 300m)
    const canAnimate = elapsed < 30_000 && meters < 300;

    if (!canAnimate) {
      animated.setValue({ ...next, latitudeDelta: 0, longitudeDelta: 0 });
    } else {
      (animated as any).timing({ ...next, duration, useNativeDriver: false }).start();
      if (Platform.OS === 'android' && markerRef.current?.animateMarkerToCoordinate) {
        markerRef.current.animateMarkerToCoordinate(next, duration);
      }
    }

    const targetHeading =
      worker.heading !== undefined && worker.heading !== null && Number.isFinite(worker.heading)
        ? normalize(worker.heading)
        : headingBetween(last, next);

    smoothRotation(targetHeading);
    previous.current = { ...worker, timestampMs: currentTimestamp };
  }, [worker, animated, smoothRotation]);

  return (
    <AnimatedMarker
      ref={markerRef}
      coordinate={animated}
      image={require('../../../assets/worker-scooter-3d.png')}
      style={styles.markerImage}
      anchor={{ x: 0.5, y: 0.90 }}
      rotation={bearing}
      flat={true}
      zIndex={zIndex}
      title={name}
      identifier="homeease-assigned-worker"
    />
  );
};

const styles = StyleSheet.create({
  markerImage: {
    width: 54,
    height: 68,
  },
});

const AnimatedMarker = Marker.Animated as any;

export default MovingWorker3DMarker;
