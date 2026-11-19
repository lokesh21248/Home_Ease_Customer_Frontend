import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { AnimatedRegion, Marker } from 'react-native-maps';

export interface WorkerGPS {
  latitude: number;
  longitude: number;
  heading?: number | null;
  timestampMs?: number; // UNIX milliseconds
}

export interface MovingWorker3DMarkerProps {
  worker: WorkerGPS;
  staleAfterMs?: number;
  name?: string;
  serviceCategory?: string;
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

function getCategoryIcon(serviceName?: string): string {
  if (!serviceName) return '🛠️';
  const lower = serviceName.toLowerCase();
  if (lower.includes('electr')) return '⚡';
  if (lower.includes('plumb')) return '💧';
  if (lower.includes('ac') || lower.includes('air') || lower.includes('cool')) return '❄️';
  if (lower.includes('clean')) return '✨';
  if (lower.includes('paint') || lower.includes('carpent')) return '🔨';
  if (lower.includes('salon') || lower.includes('massage') || lower.includes('wellness')) return '💆';
  return '🛠️';
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
 * - Floating companion upright identity badge displaying worker name, service category icon, and online status
 */
export const MovingWorker3DMarker: React.FC<MovingWorker3DMarkerProps> = ({
  worker,
  staleAfterMs = 45_000,
  name = 'Service Partner',
  serviceCategory,
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

    const currentTimestamp = worker.timestampMs ?? Date.now();
    const prevTimestamp = previous.current.timestampMs ?? (currentTimestamp - 1000);

    // Stale check
    if (Date.now() - currentTimestamp > staleAfterMs) return;

    const last = previous.current;
    const next: Position = { latitude: worker.latitude, longitude: worker.longitude };
    const meters = distanceMeters(last, next);

    // Anti-jitter: movements < 2m ignored to prevent micro-oscillation when stationary
    if (meters < 2) {
      previous.current = { ...worker, timestampMs: currentTimestamp };
      if (worker.heading !== undefined && worker.heading !== null && Number.isFinite(worker.heading)) {
        smoothRotation(worker.heading);
      }
      return;
    }

    const elapsed = Math.max(1000, currentTimestamp - prevTimestamp);
    const duration = Math.max(450, Math.min(2500, elapsed * 0.75));
    const canAnimate = elapsed < 35_000 && meters < 500;

    if (!canAnimate) {
      animated.setValue({ ...next, latitudeDelta: 0, longitudeDelta: 0 });
    } else if (Platform.OS === 'android' && markerRef.current?.animateMarkerToCoordinate) {
      markerRef.current.animateMarkerToCoordinate(next, duration);
    } else {
      (animated as any).timing({ ...next, duration, useNativeDriver: false }).start();
    }

    const targetHeading =
      worker.heading !== undefined && worker.heading !== null && Number.isFinite(worker.heading)
        ? normalize(worker.heading)
        : headingBetween(last, next);

    smoothRotation(targetHeading);
    previous.current = { ...worker, timestampMs: currentTimestamp };
  }, [worker, staleAfterMs, animated, smoothRotation]);

  const categoryIcon = getCategoryIcon(serviceCategory);

  return (
    <>
      <AnimatedMarker
        ref={markerRef}
        coordinate={animated}
        image={require('../../../assets/worker-scooter-3d.png')}
        anchor={{ x: 0.5, y: 0.9 }}
        rotation={bearing}
        flat={true}
        zIndex={zIndex}
        title={name}
        identifier="homeease-assigned-worker"
      />
      <AnimatedMarker
        coordinate={animated}
        anchor={{ x: 0.5, y: 2.1 }}
        flat={false}
        zIndex={zIndex + 1}
        tracksViewChanges={false}
      >
        <View style={styles.badgeContainer}>
          <View style={styles.onlineDot} />
          <Text style={styles.categoryIcon}>{categoryIcon}</Text>
          <Text style={styles.badgeText} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </AnimatedMarker>
    </>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  categoryIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: 100,
  },
});

const AnimatedMarker = Marker.Animated as any;

export default MovingWorker3DMarker;
