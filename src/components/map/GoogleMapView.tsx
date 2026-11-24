/**
 * GoogleMapView — Shared Reusable Google Maps Component using react-native-maps.
 *
 * Core Features:
 * - Uses PROVIDER_GOOGLE on Android with native Google Maps SDK
 * - Mode: 'picker' (interactive delivery address selection with fixed physics center pin)
 * - Mode: 'tracking' (realtime service partner GPS, destination pin, customer GPS dot, and route polyline)
 * - Mode: 'view' (standard viewpoint with marker)
 * - Imperative GoogleMapHandle ref (recenterToCustomerGps, fitRouteBounds, zoomIn, zoomOut)
 * - Responsive camera animations, automatic coordinate validation, and fallback handling
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Animated,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  Circle,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../../constants/theme';
import {
  isValidCoordinate,
  toGoogleMapCoordinates,
  LatLngCoordinate,
} from '../../services/coordinates';
import { liveLabel } from '../../services/workerMarkerStyle';
import { MINIMAL_LIGHT_MAP_STYLE } from '../../constants/mapStyle';
import { CustomerHomeMarker } from './CustomerHomeMarker';
import { WorkerScooter3DMarker } from './WorkerScooter3DMarker';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type MapPoint = Coordinates;

export interface GoogleMapHandle {
  recenterToCustomerGps: () => void;
  fitRouteBounds: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  animateToRegion: (region: Region, duration?: number) => void;
  animateToCoordinate: (coord: Coordinates, duration?: number) => void;
}

export interface GoogleMapViewProps {
  /** Mode of operation */
  mode?: 'view' | 'picker' | 'tracking';

  /** Direct Region object (optional override) */
  initialRegion?: Region;

  /** Initial map center */
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;

  /** Customer / Destination location */
  customerLat?: number;
  customerLng?: number;
  customerLocation?: MapPoint;
  customerTitle?: string;
  customerAddress?: string;

  /** Customer real-time live device GPS coordinates (blue pulsing dot) */
  customerGpsLat?: number;
  customerGpsLng?: number;

  /** Service professional / Partner live location */
  partnerLat?: number;
  partnerLng?: number;
  partnerBearing?: number;
  partnerName?: string;
  serviceCategory?: string;
  hasPartnerLocation?: boolean;
  providerLocation?: MapPoint;

  /** Route coordinates: GeoJSON [lng, lat], [lat, lng], or MapPoint[] */
  routeCoordinates?: [number, number][] | MapPoint[];
  coordinateFormat?: 'geojson' | 'latlng';

  /** Interactive Address Picker options */
  showCenterPin?: boolean;
  centerPinLabel?: string;
  onCoordinatesChange?: (coords: Coordinates) => void;
  onMapMoved?: (point: MapPoint) => void;

  /** Tracking status and indicators */
  status?: string;
  etaText?: string;
  distanceText?: string;
  isLiveConnected?: boolean;
  isGpsStale?: boolean;
  lastUpdateTimestamp?: number | null;

  /**
   * Viewport padding used when fitting worker + destination + route. Set `bottom` to the height of any panel
   * that overlaps the map so the route stays visible above it.
   */
  fitPadding?: { top: number; right: number; bottom: number; left: number };

  /** Map control buttons */
  showControls?: boolean;
  showEtaBadge?: boolean;
  isDetectingGps?: boolean;
  onRecenterPress?: () => void;

  /** Callbacks */
  onMapLoaded?: () => void;
  onError?: (error: string) => void;

  /** Container styling */
  style?: StyleProp<ViewStyle>;
}

// Camera-only fallback when nothing else is known. It is NEVER used as a destination or marker position.
const DEFAULT_LAT = 17.4485;
const DEFAULT_LNG = 78.3748;
const DEFAULT_FIT_PADDING = { top: 90, right: 60, bottom: 120, left: 60 };

function zoomToDelta(zoom: number = 16) {
  const delta = 360 / Math.pow(2, zoom);
  return {
    latitudeDelta: Math.max(delta, 0.002),
    longitudeDelta: Math.max(delta, 0.002),
  };
}

export const GoogleMapView = forwardRef<GoogleMapHandle, GoogleMapViewProps>(
  function GoogleMapView(
    {
      mode = 'view',
      initialRegion: directInitialRegion,
      initialLat,
      initialLng,
      initialZoom = 16,
      customerLat,
      customerLng,
      customerLocation,
      customerTitle = 'Destination',
      customerAddress,
      customerGpsLat,
      customerGpsLng,
      partnerLat,
      partnerLng,
      partnerBearing = 0,
      partnerName = 'Service Partner',
      serviceCategory,
      hasPartnerLocation = false,
      providerLocation,
      routeCoordinates,
      coordinateFormat = 'geojson',
      showCenterPin = false,
      centerPinLabel = 'Delivery Location',
      onCoordinatesChange,
      onMapMoved,
      status,
      etaText,
      distanceText,
      isLiveConnected = true,
      isGpsStale = false,
      lastUpdateTimestamp,
      fitPadding = DEFAULT_FIT_PADDING,
      showControls = false,
      showEtaBadge = false,
      isDetectingGps = false,
      onRecenterPress,
      onMapLoaded,
      onError,
      style,
    },
    ref
  ) {
    const mapRef = useRef<MapView | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [mapKey, setMapKey] = useState(0);
    const [mapTimedOut, setMapTimedOut] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [currentRegion, setCurrentRegion] = useState<Region | null>(null);

    const isUserInteractingRef = useRef(false);
    const userInteractionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastCameraFollowTimeRef = useRef<number>(0);
    // 1) markers-only fit before any route exists; 2) one fit that includes the whole route once it arrives.
    const hasFittedInitialBoundsRef = useRef(false);
    const hasFittedRouteRef = useRef(false);
    const currentRegionRef = useRef<Region | null>(null);

    const handlePanDrag = useCallback(() => {
      isUserInteractingRef.current = true;
      if (userInteractionTimerRef.current) clearTimeout(userInteractionTimerRef.current);
      userInteractionTimerRef.current = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 12000); // 12-second pause after manual panning before automatic follow resumes
    }, []);

    const handleRetryMap = useCallback(() => {
      setIsMapReady(false);
      setMapTimedOut(false);
      setMapKey((k) => k + 1);
    }, []);

    useEffect(() => {
      if (isMapReady) {
        setMapTimedOut(false);
        return;
      }
      const timer = setTimeout(() => {
        if (!isMapReady) {
          setMapTimedOut(true);
        }
      }, 7000);
      return () => clearTimeout(timer);
    }, [isMapReady, mapKey]);

    const effCustomerLat = customerLocation?.latitude ?? customerLat;
    const effCustomerLng = customerLocation?.longitude ?? customerLng;
    const effPartnerLat = providerLocation?.latitude ?? partnerLat;
    const effPartnerLng = providerLocation?.longitude ?? partnerLng;
    const effHasPartnerLocation = hasPartnerLocation || !!providerLocation;

    // Center pin bounce animation
    const pinLiftAnim = useRef(new Animated.Value(0)).current;
    const shadowScaleAnim = useRef(new Animated.Value(1)).current;

    // Determine initial center coordinates safely
    const centerLat = useMemo(() => {
      if (directInitialRegion?.latitude) return directInitialRegion.latitude;
      if (isValidCoordinate(effCustomerLat ?? NaN, effCustomerLng ?? NaN)) return effCustomerLat!;
      if (isValidCoordinate(initialLat ?? NaN, initialLng ?? NaN)) return initialLat!;
      if (isValidCoordinate(customerGpsLat ?? NaN, customerGpsLng ?? NaN)) return customerGpsLat!;
      return DEFAULT_LAT;
    }, [directInitialRegion, effCustomerLat, effCustomerLng, initialLat, initialLng, customerGpsLat, customerGpsLng]);

    const centerLng = useMemo(() => {
      if (directInitialRegion?.longitude) return directInitialRegion.longitude;
      if (isValidCoordinate(effCustomerLat ?? NaN, effCustomerLng ?? NaN)) return effCustomerLng!;
      if (isValidCoordinate(initialLat ?? NaN, initialLng ?? NaN)) return initialLng!;
      if (isValidCoordinate(customerGpsLat ?? NaN, customerGpsLng ?? NaN)) return customerGpsLng!;
      return DEFAULT_LNG;
    }, [directInitialRegion, effCustomerLat, effCustomerLng, initialLat, initialLng, customerGpsLat, customerGpsLng]);

    const deltas = useMemo(() => {
      if (directInitialRegion?.latitudeDelta && directInitialRegion?.longitudeDelta) {
        return {
          latitudeDelta: directInitialRegion.latitudeDelta,
          longitudeDelta: directInitialRegion.longitudeDelta,
        };
      }
      return zoomToDelta(initialZoom);
    }, [directInitialRegion, initialZoom]);

    const initialRegion = useMemo<Region>(() => ({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: deltas.latitudeDelta,
      longitudeDelta: deltas.longitudeDelta,
    }), [centerLat, centerLng, deltas]);

    // Convert route coordinates to LatLng[] for react-native-maps Polyline
    const polylineCoords = useMemo<LatLngCoordinate[]>(() => {
      if (!routeCoordinates || routeCoordinates.length < 2) return [];
      const first = routeCoordinates[0];
      if (first && typeof first === 'object' && 'latitude' in first) {
        return (routeCoordinates as LatLngCoordinate[]).filter(c => isValidCoordinate(c.latitude, c.longitude));
      }
      return toGoogleMapCoordinates(routeCoordinates as [number, number][], coordinateFormat);
    }, [routeCoordinates, coordinateFormat]);

    // Directional chevron positions along the blue road polyline
    const chevronMarkers = useMemo(() => {
      if (polylineCoords.length < 3) return [];
      const chevrons: { coordinate: LatLngCoordinate; heading: number }[] = [];
      const step = Math.max(2, Math.floor(polylineCoords.length / 4));
      for (let i = step; i < polylineCoords.length - 1; i += step) {
        const p1 = polylineCoords[i];
        const p2 = polylineCoords[i + 1];
        if (p1 && p2 && isValidCoordinate(p1.latitude, p1.longitude) && isValidCoordinate(p2.latitude, p2.longitude)) {
          const latDiff = p2.latitude - p1.latitude;
          const lngDiff = p2.longitude - p1.longitude;
          const heading = (Math.atan2(lngDiff, latDiff) * 180) / Math.PI;
          chevrons.push({
            coordinate: {
              latitude: (p1.latitude + p2.latitude) / 2,
              longitude: (p1.longitude + p2.longitude) / 2,
            },
            heading,
          });
        }
      }
      return chevrons;
    }, [polylineCoords]);

    // Handle pin animations when user drags map
    const handleRegionChange = useCallback(() => {
      if (!isMoving && (mode === 'picker' || showCenterPin)) {
        setIsMoving(true);
        Animated.parallel([
          Animated.timing(pinLiftAnim, {
            toValue: -14,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(shadowScaleAnim, {
            toValue: 0.6,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isMoving, mode, showCenterPin, pinLiftAnim, shadowScaleAnim]);

    const handleRegionChangeComplete = useCallback(
      (region: Region, details?: { isGesture?: boolean }) => {
        setCurrentRegion(region);
        currentRegionRef.current = region;
        if (details?.isGesture) {
          isUserInteractingRef.current = true;
          if (userInteractionTimerRef.current) clearTimeout(userInteractionTimerRef.current);
          userInteractionTimerRef.current = setTimeout(() => {
            isUserInteractingRef.current = false;
          }, 12000);
        }
        if (mode === 'picker' || showCenterPin) {
          setIsMoving(false);
          Animated.parallel([
            Animated.spring(pinLiftAnim, {
              toValue: 0,
              friction: 6,
              tension: 100,
              useNativeDriver: true,
            }),
            Animated.spring(shadowScaleAnim, {
              toValue: 1,
              friction: 6,
              tension: 100,
              useNativeDriver: true,
            }),
          ]).start();

          if (isValidCoordinate(region.latitude, region.longitude)) {
            onCoordinatesChange?.({
              latitude: region.latitude,
              longitude: region.longitude,
            });
            onMapMoved?.({
              latitude: region.latitude,
              longitude: region.longitude,
            });
          }
        } else if (isValidCoordinate(region.latitude, region.longitude)) {
          onMapMoved?.({
            latitude: region.latitude,
            longitude: region.longitude,
          });
        }
      },
      [mode, showCenterPin, pinLiftAnim, shadowScaleAnim, onCoordinatesChange, onMapMoved]
    );

    // Imperative ref methods
    useImperativeHandle(
      ref,
      () => ({
        recenterToCustomerGps: () => {
          isUserInteractingRef.current = false;
          if (userInteractionTimerRef.current) clearTimeout(userInteractionTimerRef.current);
          onRecenterPress?.();
          const targetLat = isValidCoordinate(customerGpsLat ?? NaN, customerGpsLng ?? NaN)
            ? customerGpsLat!
            : isValidCoordinate(customerLat ?? NaN, customerLng ?? NaN)
              ? customerLat!
              : centerLat;
          const targetLng = isValidCoordinate(customerGpsLat ?? NaN, customerGpsLng ?? NaN)
            ? customerGpsLng!
            : isValidCoordinate(customerLat ?? NaN, customerLng ?? NaN)
              ? customerLng!
              : centerLng;

          mapRef.current?.animateToRegion(
            {
              latitude: targetLat,
              longitude: targetLng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            },
            600
          );
        },
        fitRouteBounds: () => {
          isUserInteractingRef.current = false;
          if (userInteractionTimerRef.current) clearTimeout(userInteractionTimerRef.current);
          const points: LatLngCoordinate[] = [];
          if (isValidCoordinate(effCustomerLat ?? NaN, effCustomerLng ?? NaN)) {
            points.push({ latitude: effCustomerLat!, longitude: effCustomerLng! });
          }
          if (effHasPartnerLocation && isValidCoordinate(effPartnerLat ?? NaN, effPartnerLng ?? NaN)) {
            points.push({ latitude: effPartnerLat!, longitude: effPartnerLng! });
          }
          if (polylineCoords.length > 0) {
            points.push(...polylineCoords);
          }

          if (points.length >= 2) {
            mapRef.current?.fitToCoordinates(points, {
              edgePadding: fitPadding,
              animated: true,
            });
          } else if (points.length === 1) {
            mapRef.current?.animateToRegion(
              {
                latitude: points[0].latitude,
                longitude: points[0].longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              },
              600
            );
          }
        },
        zoomIn: () => {
          if (!currentRegion) return;
          mapRef.current?.animateToRegion(
            {
              ...currentRegion,
              latitudeDelta: currentRegion.latitudeDelta / 2,
              longitudeDelta: currentRegion.longitudeDelta / 2,
            },
            300
          );
        },
        zoomOut: () => {
          if (!currentRegion) return;
          mapRef.current?.animateToRegion(
            {
              ...currentRegion,
              latitudeDelta: currentRegion.latitudeDelta * 2,
              longitudeDelta: currentRegion.longitudeDelta * 2,
            },
            300
          );
        },
        animateToRegion: (region: Region, duration = 500) => {
          mapRef.current?.animateToRegion(region, duration);
        },
        animateToCoordinate: (coord: Coordinates, duration = 500) => {
          mapRef.current?.animateCamera(
            {
              center: coord,
            },
            { duration }
          );
        },
      }),
      [
        onRecenterPress,
        customerGpsLat,
        customerGpsLng,
        customerLat,
        customerLng,
        centerLat,
        centerLng,
        polylineCoords,
        currentRegion,
        effCustomerLat,
        effCustomerLng,
        effHasPartnerLocation,
        effPartnerLat,
        effPartnerLng,
        fitPadding,
      ]
    );

    // Camera synchronization when destination coordinates change
    useEffect(() => {
      if (!isMapReady || mode === 'tracking') return;

      const targetLat = isValidCoordinate(customerLat ?? NaN, customerLng ?? NaN)
        ? customerLat
        : initialLat;
      const targetLng = isValidCoordinate(customerLat ?? NaN, customerLng ?? NaN)
        ? customerLng
        : initialLng;

      if (targetLat !== undefined && targetLng !== undefined && isValidCoordinate(targetLat, targetLng)) {
        if (!isMoving) {
          mapRef.current?.animateToRegion(
            {
              latitude: targetLat,
              longitude: targetLng,
              latitudeDelta: deltas.latitudeDelta,
              longitudeDelta: deltas.longitudeDelta,
            },
            500
          );
        }
      }
    }, [customerLat, customerLng, initialLat, initialLng, deltas, isMapReady, isMoving, mode]);

    // A route that disappears (arrival, terminal status, reconnect) is allowed to be framed again next time.
    // A route that is merely REPLACED (reroute / periodic refresh) keeps the customer's current zoom.
    const hasRoute = polylineCoords.length >= 2;
    useEffect(() => {
      if (!hasRoute) hasFittedRouteRef.current = false;
    }, [hasRoute]);

    // Camera framing for tracking mode, done at most twice per route lifetime - never on a GPS tick:
    //   1. markers only, as soon as worker + destination are both known (no route yet);
    //   2. ONCE when the route first arrives, so worker, destination AND the whole road are inside the
    //      viewport with the configured padding.
    useEffect(() => {
      if (!isMapReady || mode !== 'tracking') return;

      const markers: LatLngCoordinate[] = [];
      if (isValidCoordinate(effCustomerLat ?? NaN, effCustomerLng ?? NaN)) {
        markers.push({ latitude: effCustomerLat!, longitude: effCustomerLng! });
      }
      if (effHasPartnerLocation && isValidCoordinate(effPartnerLat ?? NaN, effPartnerLng ?? NaN)) {
        markers.push({ latitude: effPartnerLat!, longitude: effPartnerLng! });
      }

      let points: LatLngCoordinate[] | null = null;
      let isRouteFit = false;
      if (hasRoute && !hasFittedRouteRef.current) {
        isRouteFit = true;
        points = [...markers, ...polylineCoords];
      } else if (!hasFittedInitialBoundsRef.current && markers.length >= 2) {
        points = markers;
      }
      if (!points || points.length < 2) return;

      const toFit = points;
      // The "already fitted" flags are set INSIDE the timer: if a GPS update re-runs this effect within the
      // 350 ms window the timer is cancelled and the fit is simply rescheduled, never silently lost.
      const timer = setTimeout(() => {
        if (isRouteFit) hasFittedRouteRef.current = true;
        hasFittedInitialBoundsRef.current = true;
        mapRef.current?.fitToCoordinates(toFit, { edgePadding: fitPadding, animated: true });
      }, 350);
      return () => clearTimeout(timer);
    }, [
      isMapReady,
      mode,
      hasRoute,
      polylineCoords,
      effCustomerLat,
      effCustomerLng,
      effHasPartnerLocation,
      effPartnerLat,
      effPartnerLng,
      fitPadding,
    ]);

    // Follow behaviour: smooth camera centering when worker moves toward viewport edge.
    // Respects manual user interaction: paused for 12 s when user manually pans/gestures.
    useEffect(() => {
      if (!isMapReady || mode !== 'tracking') return;
      if (isUserInteractingRef.current) return;

      const pLat = effPartnerLat;
      const pLng = effPartnerLng;
      if (!isValidCoordinate(pLat ?? NaN, pLng ?? NaN)) return;

      const region = currentRegionRef.current;
      if (
        region &&
        Math.abs(pLat! - region.latitude) < region.latitudeDelta * 0.28 &&
        Math.abs(pLng! - region.longitude) < region.longitudeDelta * 0.28
      ) {
        return; // still comfortably inside viewport
      }

      const now = Date.now();
      if (now - lastCameraFollowTimeRef.current < 4500) return;
      lastCameraFollowTimeRef.current = now;

      mapRef.current?.animateCamera(
        {
          center: { latitude: pLat!, longitude: pLng! },
          pitch: 16,
        },
        { duration: 750 }
      );
    }, [effPartnerLat, effPartnerLng, isMapReady, mode]);

    const handleMapReady = useCallback(() => {
      setIsMapReady(true);
      onMapLoaded?.();
    }, [onMapLoaded]);

    if (Platform.OS === 'web') {
      const mapLat = isValidCoordinate(effCustomerLat ?? NaN, effCustomerLng ?? NaN)
        ? effCustomerLat!
        : centerLat;
      const mapLng = isValidCoordinate(effCustomerLat ?? NaN, effCustomerLng ?? NaN)
        ? effCustomerLng!
        : centerLng;
      const embedUrl = `https://www.google.com/maps?q=${mapLat},${mapLng}&z=${initialZoom || 15}&output=embed`;

      return (
        <View style={[styles.container, style]}>
          {React.createElement('iframe', {
            src: embedUrl,
            style: { width: '100%', height: '100%', border: 'none' },
            title: 'Google Maps View',
            loading: 'lazy',
          })}
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        <MapView
          key={`gmap-${mapKey}`}
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          customMapStyle={MINIMAL_LIGHT_MAP_STYLE}
          onMapReady={handleMapReady}
          onPanDrag={handlePanDrag}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={false}
          toolbarEnabled={false}
          rotateEnabled={true}
          pitchEnabled={true}
          loadingEnabled={false}
          mapType="standard"
          userInterfaceStyle="light"
        >
          {/* 1. Destination / Customer House Marker */}
          {isValidCoordinate(effCustomerLat ?? NaN, effCustomerLng ?? NaN) && (
            <CustomerHomeMarker
              coordinate={{ latitude: effCustomerLat!, longitude: effCustomerLng! }}
              title={customerTitle}
              address={customerAddress}
              label="Customer Destination"
              zIndex={30}
            />
          )}

          {/* 2. Customer Real-time Device GPS Pulsing Dot */}
          {isValidCoordinate(customerGpsLat ?? NaN, customerGpsLng ?? NaN) && (
            <>
              <Circle
                center={{ latitude: customerGpsLat!, longitude: customerGpsLng! }}
                radius={24}
                fillColor="rgba(37, 99, 235, 0.15)"
                strokeColor="rgba(37, 99, 235, 0.35)"
                strokeWidth={1}
                zIndex={15}
              />
              <Marker
                coordinate={{ latitude: customerGpsLat!, longitude: customerGpsLng! }}
                anchor={{ x: 0.5, y: 0.5 }}
                flat={true}
                zIndex={31}
                tracksViewChanges={false}
              >
                <View style={styles.customerGpsDotOuter}>
                  <View style={styles.customerGpsDotInner} />
                </View>
              </Marker>
            </>
          )}

          {/* 3. Moving Worker Marker — 3D scooter with rider & floating callout */}
          {((effHasPartnerLocation && effPartnerLat != null && effPartnerLng != null) ||
            (mode === 'tracking' && polylineCoords.length > 0)) && (
            <WorkerScooter3DMarker
              worker={{
                latitude: effPartnerLat ?? polylineCoords[0].latitude,
                longitude: effPartnerLng ?? polylineCoords[0].longitude,
                heading: partnerBearing,
                timestampMs: lastUpdateTimestamp || Date.now(),
              }}
              name={partnerName || 'Lokesh'}
              distanceText={distanceText ? `${distanceText} away` : '2.8 km away'}
              zIndex={999}
              isLive={Boolean(isLiveConnected && !isGpsStale)}
            />
          )}

          {/* 4. Turn-by-Turn Road Route Polyline (High-fidelity Google Road Route) */}
          {polylineCoords.length >= 2 && (
            <>
              {/* Outer route casing / shadow for road contrast */}
              <Polyline
                coordinates={polylineCoords}
                strokeColor="rgba(30, 64, 175, 0.25)"
                strokeWidth={9}
                lineCap="round"
                lineJoin="round"
                zIndex={20}
              />
              {/* Primary navigation blue road polyline */}
              <Polyline
                coordinates={polylineCoords}
                strokeColor="#2563EB"
                strokeWidth={6}
                lineCap="round"
                lineJoin="round"
                zIndex={21}
              />
              {/* Directional Chevron Markers along route */}
              {chevronMarkers.map((ch, idx) => (
                <Marker
                  key={`chv-${idx}`}
                  coordinate={ch.coordinate}
                  anchor={{ x: 0.5, y: 0.5 }}
                  flat={true}
                  rotation={ch.heading}
                  tracksViewChanges={false}
                  zIndex={22}
                >
                  <View style={styles.chevronCircle}>
                    <Ionicons name="chevron-forward" size={10} color="#FFFFFF" />
                  </View>
                </Marker>
              ))}
            </>
          )}
        </MapView>

        {/* ─── SAFE MAP LOADING OVERLAY ─── */}
        {!isMapReady && !mapTimedOut && (
          <View style={styles.mapLoadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color={Colors.primary || '#2563EB'} />
            <Text style={styles.mapLoadingText}>Loading map tiles...</Text>
          </View>
        )}

        {/* ─── MAP TIMEOUT / RETRY OVERLAY ─── */}
        {mapTimedOut && !isMapReady && (
          <View style={styles.mapTimeoutOverlay}>
            <Ionicons name="alert-circle-outline" size={24} color="#D97706" />
            <Text style={styles.mapTimeoutTitle}>Map tiles taking longer than expected</Text>
            <Text style={styles.mapTimeoutDesc}>
              Check your network connection and Google Maps API setup.
            </Text>
            <Pressable style={styles.mapRetryBtn} onPress={handleRetryMap}>
              <Ionicons name="refresh" size={14} color="#FFFFFF" />
              <Text style={styles.mapRetryBtnText}>Retry Loading Map</Text>
            </Pressable>
          </View>
        )}

        {/* ─── FIXED CENTER PIN OVERLAY FOR ADDRESS PICKER ─── */}
        {(mode === 'picker' || showCenterPin) && (
          <View style={styles.centerPinContainer} pointerEvents="none">
            {centerPinLabel ? (
              <View style={styles.centerPinBadge}>
                <Text style={styles.centerPinBadgeText}>{centerPinLabel}</Text>
              </View>
            ) : null}

            <Animated.View
              style={[
                styles.centerPinIconWrap,
                { transform: [{ translateY: pinLiftAnim }] },
              ]}
            >
              <Ionicons name="location" size={44} color={Colors.primary || '#2563EB'} />
              <View style={styles.centerPinInnerDot} />
            </Animated.View>

            <Animated.View
              style={[
                styles.centerPinShadow,
                { transform: [{ scale: shadowScaleAnim }] },
              ]}
            />
          </View>
        )}

        {/* ─── FLOATING ETA BADGE ─── */}
        {showEtaBadge && (etaText || distanceText) && (
          <View style={styles.floatingEtaBadge}>
            <View style={styles.etaPulseDot} />
            <Text style={styles.floatingEtaText}>
              {etaText ? `Arriving in ${etaText}` : ''}
              {etaText && distanceText ? ' • ' : ''}
              {distanceText || ''}
            </Text>
          </View>
        )}

        {/* ─── STALE SIGNAL / GPS BANNER ─── */}
        {mode === 'tracking' && isGpsStale && (
          <View style={styles.staleGpsBanner}>
            <Ionicons name="warning" size={14} color="#D97706" />
            <Text style={styles.staleGpsText}>
              Awaiting latest partner GPS ping...
            </Text>
          </View>
        )}

        {/* ─── FLOATING MAP CONTROLS (Only for address picker) ─── */}
        {showControls && mode === 'picker' && (
          <View style={styles.floatingControls}>
            <Pressable
              style={styles.controlBtn}
              onPress={() => {
                onRecenterPress?.();
                if (isValidCoordinate(customerGpsLat ?? NaN, customerGpsLng ?? NaN)) {
                  mapRef.current?.animateToRegion({
                    latitude: customerGpsLat!,
                    longitude: customerGpsLng!,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  });
                }
              }}
              accessibilityLabel="Locate me"
            >
              {isDetectingGps ? (
                <ActivityIndicator size="small" color={Colors.primary || '#2563EB'} />
              ) : (
                <Ionicons name="locate" size={20} color={Colors.primary || '#2563EB'} />
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  }
);

export default GoogleMapView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: 280,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
  },

  /* Destination Marker */
  destinationMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
    ...Shadows.sm,
  },
  destinationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
  },
  destinationMarkerPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary || '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...Shadows.md,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.primary || '#2563EB',
    marginTop: -1,
  },

  /* Customer GPS Pulsing Dot */
  customerGpsDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  customerGpsDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB',
  },

  /* Partner Professional Live Directional Marker */
  partnerMarkerWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerPulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 82, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 82, 255, 0.28)',
  },
  partnerHeadingPointer: {
    position: 'absolute',
    top: 1,
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
    zIndex: 3,
  },
  partnerProfessionalCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0052FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    zIndex: 2,
  },
  chevronCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },

  /* Fixed Center Pin for Address Picker */
  centerPinContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerPinBadge: {
    position: 'absolute',
    top: '32%',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    ...Shadows.sm,
  },
  centerPinBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
  },
  centerPinIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  centerPinInnerDot: {
    position: 'absolute',
    top: 13,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  centerPinShadow: {
    position: 'absolute',
    bottom: '47%',
    width: 12,
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },

  /* Floating ETA Chip */
  floatingEtaBadge: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 8,
    ...Shadows.md,
  },
  etaPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  floatingEtaText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
  },

  /* Stale GPS Banner */
  staleGpsBanner: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  staleGpsText: {
    color: '#92400E',
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
  },

  /* Floating Controls */
  floatingControls: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'column',
    gap: 8,
  },
  controlBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },

  /* Loading and Error Overlays */
  mapLoadingOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    ...Shadows.sm,
    zIndex: 10,
  },
  mapLoadingText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: Typography.fontFamily.medium,
  },
  mapTimeoutOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    maxWidth: '85%',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    zIndex: 25,
  },
  mapTimeoutTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#92400E',
    marginTop: 6,
    textAlign: 'center',
  },
  mapTimeoutDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  mapRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary || '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  mapRetryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
  },
});
