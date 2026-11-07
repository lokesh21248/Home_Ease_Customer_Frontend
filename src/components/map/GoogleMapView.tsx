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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Shadows } from '../../constants/theme';
import {
  isValidCoordinate,
  toGoogleMapCoordinates,
  LatLngCoordinate,
} from '../../services/coordinates';

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

const DEFAULT_LAT = 17.4485;
const DEFAULT_LNG = 78.3748;

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
      (region: Region) => {
        setCurrentRegion(region);
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
          const points: LatLngCoordinate[] = [];
          if (isValidCoordinate(customerLat ?? NaN, customerLng ?? NaN)) {
            points.push({ latitude: customerLat!, longitude: customerLng! });
          }
          if (hasPartnerLocation && isValidCoordinate(partnerLat ?? NaN, partnerLng ?? NaN)) {
            points.push({ latitude: partnerLat!, longitude: partnerLng! });
          }
          if (polylineCoords.length > 0) {
            points.push(...polylineCoords);
          }

          if (points.length >= 2) {
            mapRef.current?.fitToCoordinates(points, {
              edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
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
        hasPartnerLocation,
        partnerLat,
        partnerLng,
        polylineCoords,
        currentRegion,
      ]
    );

    // Camera synchronization when destination coordinates or GPS coordinates change
    useEffect(() => {
      if (!isMapReady) return;

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
    }, [customerLat, customerLng, initialLat, initialLng, deltas, isMapReady, isMoving]);

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
          onMapReady={handleMapReady}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={false}
          toolbarEnabled={false}
          rotateEnabled={true}
          pitchEnabled={false}
          loadingEnabled={false}
          mapType="standard"
          userInterfaceStyle="light"
        >
          {/* 1. Destination / Customer House Marker */}
          {isValidCoordinate(effCustomerLat ?? NaN, effCustomerLng ?? NaN) && (
            <Marker
              coordinate={{ latitude: effCustomerLat!, longitude: effCustomerLng! }}
              title={customerTitle}
              description={customerAddress}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={30}
              tracksViewChanges={false}
            >
              <View style={styles.destinationMarkerWrap}>
                <View style={styles.destinationMarkerPin}>
                  <Ionicons name="home" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.markerTriangle} />
              </View>
            </Marker>
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

          {/* 3. Partner / Vehicle Live Marker */}
          {effHasPartnerLocation &&
            isValidCoordinate(effPartnerLat ?? NaN, effPartnerLng ?? NaN) && (
              <Marker
                coordinate={{ latitude: effPartnerLat!, longitude: effPartnerLng! }}
                title={partnerName}
                anchor={{ x: 0.5, y: 0.5 }}
                flat={true}
                rotation={partnerBearing}
                zIndex={32}
                tracksViewChanges={false}
              >
                <View style={styles.partnerMarkerWrap}>
                  <View style={styles.partnerVehicleCircle}>
                    <MaterialCommunityIcons
                      name="motorbike"
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.partnerHeadingArrow} />
                </View>
              </Marker>
            )}

          {/* 4. Turn-by-Turn Road Route Polyline */}
          {polylineCoords.length >= 2 && (
            <>
              <Polyline
                coordinates={polylineCoords}
                strokeColor="rgba(30, 64, 175, 0.4)"
                strokeWidth={7}
                lineCap="round"
                lineJoin="round"
                zIndex={20}
              />
              <Polyline
                coordinates={polylineCoords}
                strokeColor={Colors.primary || '#2563EB'}
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
                zIndex={21}
              />
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

        {/* ─── FLOATING MAP CONTROLS ─── */}
        {showControls && (
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

            {hasPartnerLocation && (
              <Pressable
                style={styles.controlBtn}
                onPress={() => {
                  const points: LatLngCoordinate[] = [];
                  if (isValidCoordinate(customerLat ?? NaN, customerLng ?? NaN)) {
                    points.push({ latitude: customerLat!, longitude: customerLng! });
                  }
                  if (isValidCoordinate(partnerLat ?? NaN, partnerLng ?? NaN)) {
                    points.push({ latitude: partnerLat!, longitude: partnerLng! });
                  }
                  if (polylineCoords.length > 0) {
                    points.push(...polylineCoords);
                  }
                  if (points.length >= 2) {
                    mapRef.current?.fitToCoordinates(points, {
                      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                      animated: true,
                    });
                  }
                }}
                accessibilityLabel="Fit map to route"
              >
                <Ionicons name="scan-outline" size={19} color="#1E293B" />
              </Pressable>
            )}

            <Pressable
              style={styles.controlBtn}
              onPress={() => {
                if (!currentRegion) return;
                mapRef.current?.animateToRegion({
                  ...currentRegion,
                  latitudeDelta: currentRegion.latitudeDelta / 2,
                  longitudeDelta: currentRegion.longitudeDelta / 2,
                });
              }}
              accessibilityLabel="Zoom in"
            >
              <Ionicons name="add" size={20} color="#1E293B" />
            </Pressable>

            <Pressable
              style={styles.controlBtn}
              onPress={() => {
                if (!currentRegion) return;
                mapRef.current?.animateToRegion({
                  ...currentRegion,
                  latitudeDelta: currentRegion.latitudeDelta * 2,
                  longitudeDelta: currentRegion.longitudeDelta * 2,
                });
              }}
              accessibilityLabel="Zoom out"
            >
              <Ionicons name="remove" size={20} color="#1E293B" />
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

  /* Partner Vehicle Marker */
  partnerMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerVehicleCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...Shadows.md,
  },
  partnerHeadingArrow: {
    position: 'absolute',
    top: -5,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#10B981',
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
