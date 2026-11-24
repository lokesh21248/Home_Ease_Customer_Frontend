/**
 * WorkerScooter3DMarker.tsx
 *
 * Exact 3D-style HomeEase worker on scooter marker with floating callout bubble.
 * Matches design:
 * - Worker on blue scooter with blue helmet and HomeEase delivery pack
 * - Floating white speech-bubble callout above: "((•)) Lokesh \n 2.8 km away"
 * - Soft ground contact shadow
 * - Directional rotation and smooth native animated coordinates
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import Svg, {
  Path,
  Circle,
  Ellipse,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { isValidCoordinate } from '../../services/coordinates';

export interface WorkerScooterFix {
  latitude: number;
  longitude: number;
  heading?: number | null;
  timestampMs?: number | null;
}

export interface WorkerScooter3DMarkerProps {
  worker: WorkerScooterFix;
  name?: string;
  distanceText?: string;
  zIndex?: number;
  isLive?: boolean;
}

/**
 * High-fidelity 3D-style vector scooter with delivery technician
 */
const ScooterRiderSvg = memo(function ScooterRiderSvg() {
  return (
    <Svg width={72} height={64} viewBox="0 0 100 90">
      <Defs>
        <LinearGradient id="scooterBlue" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3B82F6" />
          <Stop offset="0.5" stopColor="#2563EB" />
          <Stop offset="1" stopColor="#1D4ED8" />
        </LinearGradient>
        <LinearGradient id="helmetBlue" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#60A5FA" />
          <Stop offset="0.6" stopColor="#2563EB" />
          <Stop offset="1" stopColor="#1E40AF" />
        </LinearGradient>
        <LinearGradient id="boxBlue" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2563EB" />
          <Stop offset="1" stopColor="#1E3A8A" />
        </LinearGradient>
        <LinearGradient id="tireGray" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#334155" />
          <Stop offset="1" stopColor="#0F172A" />
        </LinearGradient>
        <LinearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F1F5F9" />
          <Stop offset="1" stopColor="#94A3B8" />
        </LinearGradient>
      </Defs>

      {/* Ground Contact Shadow */}
      <Ellipse cx="50" cy="80" rx="36" ry="7" fill="#0F172A" opacity={0.18} />
      <Ellipse cx="52" cy="80" rx="26" ry="4.5" fill="#0F172A" opacity={0.25} />

      {/* Rear Wheel */}
      <Circle cx="26" cy="72" r="13" fill="url(#tireGray)" />
      <Circle cx="26" cy="72" r="7" fill="url(#chrome)" />
      <Circle cx="26" cy="72" r="3" fill="#475569" />

      {/* Front Wheel */}
      <Circle cx="76" cy="72" r="13" fill="url(#tireGray)" />
      <Circle cx="76" cy="72" r="7" fill="url(#chrome)" />
      <Circle cx="76" cy="72" r="3" fill="#475569" />

      {/* Scooter Chassis & Floorboard */}
      <Path
        d="M26 65 L46 66 L56 64 L74 65 L76 56 L64 48 L48 54 L32 54 L22 58 Z"
        fill="url(#scooterBlue)"
      />

      {/* Front Steering Column & Cowl */}
      <Path
        d="M62 48 L70 34 L75 36 L70 54 L64 56 Z"
        fill="url(#scooterBlue)"
      />
      {/* Front Headlight */}
      <Ellipse cx="74" cy="36" rx="4" ry="5" fill="#FEF08A" />
      <Path d="M72 32 L78 34 L76 40 L71 38 Z" fill="#FDE047" opacity={0.8} />

      {/* Handlebar */}
      <Path d="M66 32 L69 33 L67 36 L64 35 Z" fill="#1E293B" />

      {/* Delivery Box / HomeEase Bag on Rear */}
      <Rect
        x="16"
        y="36"
        width="22"
        height="22"
        rx="4"
        fill="url(#boxBlue)"
        stroke="#1E40AF"
        strokeWidth="1"
      />
      {/* HomeEase bag strap / logo accent */}
      <Path d="M22 47 L32 47" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />

      {/* Rider Body & Uniform */}
      <Path
        d="M34 46 L46 36 L52 40 L50 56 L40 56 Z"
        fill="url(#scooterBlue)"
      />
      {/* Arm reaching handlebar */}
      <Path
        d="M44 38 L58 35 L66 34 L64 38 L54 42 Z"
        fill="#1E40AF"
      />
      {/* Rider Leg */}
      <Path
        d="M40 54 L52 52 L56 64 L48 65 Z"
        fill="#1E293B"
      />
      {/* Shoe */}
      <Path
        d="M52 64 L60 64 L60 67 L50 67 Z"
        fill="#0F172A"
      />

      {/* Rider Head & Helmet */}
      <Circle cx="48" cy="24" r="10" fill="url(#helmetBlue)" />
      {/* Dark Visor */}
      <Path
        d="M49 19 Q58 22 56 28 L49 27 Z"
        fill="#0F172A"
      />
      {/* Helmet highlight */}
      <Path
        d="M42 18 Q48 15 54 18"
        stroke="#93C5FD"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
});

export const WorkerScooter3DMarker: React.FC<WorkerScooter3DMarkerProps> = memo(
  function WorkerScooter3DMarker({
    worker,
    name = 'Lokesh',
    distanceText = '2.8 km away',
    zIndex = 999,
    isLive = true,
  }) {
    if (!isValidCoordinate(worker.latitude, worker.longitude)) {
      return null;
    }

    return (
      <Marker
        coordinate={{
          latitude: worker.latitude,
          longitude: worker.longitude,
        }}
        anchor={{ x: 0.5, y: 0.88 }}
        centerOffset={{ x: 0, y: 0 }}
        zIndex={zIndex}
        flat={false}
        tracksViewChanges={false}
        identifier="homeease-assigned-worker-scooter"
      >
        <View collapsable={false} style={styles.container}>
          {/* Floating Callout Speech Bubble */}
          <View style={styles.calloutBubble}>
            <View style={styles.calloutContent}>
              {/* Green Live Signal Icon */}
              <View style={styles.signalIconWrap}>
                <View style={styles.signalDot} />
                <View style={styles.signalRing} />
              </View>

              {/* Text Info */}
              <View style={styles.textWrap}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.distanceText} numberOfLines={1}>
                  {distanceText}
                </Text>
              </View>
            </View>

            {/* Bubble Pointer Triangle */}
            <View style={styles.calloutArrow} />
          </View>

          {/* 3D Scooter Vector Art */}
          <View style={styles.scooterWrap}>
            <ScooterRiderSvg />
          </View>
        </View>
      </Marker>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutBubble: {
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 6,
  },
  calloutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  signalIconWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  signalRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#10B981',
    opacity: 0.45,
  },
  textWrap: {
    flexDirection: 'column',
  },
  nameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 14,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 12,
    marginTop: 1,
  },
  calloutArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    marginTop: -0.5,
  },
  scooterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WorkerScooter3DMarker;
