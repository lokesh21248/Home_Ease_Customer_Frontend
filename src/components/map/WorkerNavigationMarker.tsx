import React, { memo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import { shortestAngleDistance, normalizeHeading } from '../../services/trackingMath';
import { LatLngCoordinate } from '../../services/coordinates';

export interface WorkerNavigationMarkerProps {
  /** Real-time coordinate of worker */
  coordinate: LatLngCoordinate;
  /** GPS heading or movement bearing in degrees (0 - 360) */
  heading?: number;
  /** Worker's display name */
  name?: string;
  /** Speed in km/h for deadband stationary filtering */
  speed?: number;
  /** Z-index on map (default 32) */
  zIndex?: number;
  /** Whether live GPS is actively streaming */
  isLive?: boolean;
}

/**
 * WorkerNavigationMarker — Pronto-Style Custom Top-Down Professional Person Marker
 *
 * Features:
 * - Top-down human professional technician silhouette (HomeEase blue uniform, white silhouette)
 * - Sharp directional navigation pointer pointing forward along travel bearing
 * - Smooth shortest-angle heading interpolation (handles 359° <-> 1° without spinning)
 * - Anti-jitter deadband filtering when stationary
 * - Native Android Google Maps SDK hardware-accelerated billboard/ground rendering
 * - Pure React Native vector geometry (no rasterization artifacts or external image dependencies)
 */
export const WorkerNavigationMarker = memo(function WorkerNavigationMarker({
  coordinate,
  heading = 0,
  name = 'Service Partner',
  speed = 0,
  zIndex = 32,
  isLive = true,
}: WorkerNavigationMarkerProps) {
  const currentHeadingRef = useRef(normalizeHeading(heading));
  const [displayHeading, setDisplayHeading] = useState(currentHeadingRef.current);
  const animFrameRef = useRef<number | null>(null);

  // Smooth heading transition avoiding the 359° -> 1° 358-degree spin
  useEffect(() => {
    if (!Number.isFinite(heading)) return;
    const target = normalizeHeading(heading);
    const prev = currentHeadingRef.current;
    const diff = shortestAngleDistance(prev, target);

    // Deadband filter: don't vibrate or rotate if drift is less than 3° while near-stationary
    if (Math.abs(diff) < 3 && speed < 1.5) {
      return;
    }

    const startTime = Date.now();
    const duration = 280; // ms transition duration
    const startAngle = prev;

    const animateHeading = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextAngle = normalizeHeading(startAngle + diff * eased);

      currentHeadingRef.current = nextAngle;
      setDisplayHeading(nextAngle);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateHeading);
      }
    };

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(animateHeading);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [heading, speed]);

  return (
    <Marker
      coordinate={coordinate}
      title={name}
      anchor={{ x: 0.5, y: 0.5 }}
      flat={true}
      rotation={displayHeading}
      zIndex={zIndex}
      tracksViewChanges={false}
    >
      <View style={styles.markerContainer}>
        {/* Directional Forward Pointer (points at 12 o'clock, base touches top of disc) */}
        <View style={styles.directionalPointerWrap}>
          <View style={styles.directionalPointer} />
        </View>

        {/* Soft GPS Pulse Halo */}
        <View style={[styles.pulseHalo, isLive && styles.pulseHaloActive]} />

        {/* Core Professional Person Badge in HomeEase Blue */}
        <View style={styles.coreDisc}>
          {/* Top-Down Human Silhouette: Head */}
          <View style={styles.personHead} />
          {/* Top-Down Human Silhouette: Shoulders / Uniform */}
          <View style={styles.personShoulders} />
        </View>
      </View>
    </Marker>
  );
});

export default WorkerNavigationMarker;

const styles = StyleSheet.create({
  markerContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionalPointerWrap: {
    position: 'absolute',
    top: 1,
    alignItems: 'center',
    zIndex: 4,
  },
  directionalPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0052FF',
  },
  pulseHalo: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 82, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 82, 255, 0.25)',
  },
  pulseHaloActive: {
    backgroundColor: 'rgba(0, 82, 255, 0.16)',
    borderColor: 'rgba(0, 82, 255, 0.35)',
  },
  coreDisc: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0052FF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
    zIndex: 3,
    ...Platform.select({
      android: {
        elevation: 5,
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.28,
        shadowRadius: 3.5,
      },
    }),
  },
  personHead: {
    width: 8.5,
    height: 8.5,
    borderRadius: 4.25,
    backgroundColor: '#FFFFFF',
    marginBottom: 2,
  },
  personShoulders: {
    width: 16,
    height: 7.5,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: '#FFFFFF',
  },
});
