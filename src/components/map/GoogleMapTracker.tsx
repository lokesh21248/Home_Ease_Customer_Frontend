/**
 * GoogleMapTracker — Real-Time Live Partner GPS Tracking Map using Google Maps.
 * High-performance native Google Maps tracking implementation.
 *
 * Renders:
 * - Native Google Maps with PROVIDER_GOOGLE on Android
 * - Turn-by-turn road polyline with casing
 * - Moving service partner vehicle marker with bearing rotation
 * - Destination customer house pin
 * - Real-time ETA and distance indicator
 * - Interactive camera controls (recenter to customer GPS, fit route, zoom)
 */

import React, { forwardRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { GoogleMapView, GoogleMapHandle } from './GoogleMapView';
import { LatLngCoordinate } from '../../services/coordinates';

export interface GoogleMapTrackerProps {
  partnerLat?: number;
  partnerLng?: number;
  hasPartnerLocation?: boolean;
  isLiveConnected?: boolean;
  isGpsStale?: boolean;
  partnerBearing?: number;
  partnerName?: string;
  serviceCategory?: string;
  /**
   * The booking's persisted service-address coordinates. When absent/invalid NO destination marker is drawn
   * (the map never substitutes a default or the customer's GPS as the destination).
   */
  destLat?: number;
  destLng?: number;
  destAddress?: string;
  /** Padding for fitting worker + destination + route (set bottom to the height of any overlapping panel). */
  fitPadding?: { top: number; right: number; bottom: number; left: number };
  customerGpsLat?: number;
  customerGpsLng?: number;
  routeCoordinates?: [number, number][] | LatLngCoordinate[];
  lastUpdateTimestamp?: number | null;
  status?: string;
  etaText?: string;
  distanceText?: string;
  onMapLoaded?: () => void;
  onRecenterPress?: () => void;
  showControls?: boolean;
  showEtaBadge?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const GoogleMapTracker = forwardRef<GoogleMapHandle, GoogleMapTrackerProps>(
  function GoogleMapTracker(
    {
      partnerLat,
      partnerLng,
      hasPartnerLocation = false,
      isLiveConnected = false,
      isGpsStale = false,
      partnerBearing = 0,
      partnerName = 'Service Partner',
      serviceCategory,
      destLat,
      destLng,
      destAddress = 'Your Location',
      fitPadding,
      customerGpsLat,
      customerGpsLng,
      routeCoordinates = [],
      lastUpdateTimestamp,
      status = 'ACCEPTED',
      etaText,
      distanceText,
      onMapLoaded,
      onRecenterPress,
      showControls = false,
      showEtaBadge = false,
      style,
    },
    ref
  ) {
    return (
      <GoogleMapView
        ref={ref}
        mode="tracking"
        initialLat={destLat}
        initialLng={destLng}
        customerLat={destLat}
        customerLng={destLng}
        fitPadding={fitPadding}
        customerGpsLat={customerGpsLat}
        customerGpsLng={customerGpsLng}
        customerTitle="Service Destination"
        customerAddress={destAddress}
        partnerLat={partnerLat}
        partnerLng={partnerLng}
        partnerBearing={partnerBearing}
        partnerName={partnerName}
        serviceCategory={serviceCategory}
        hasPartnerLocation={hasPartnerLocation}
        routeCoordinates={routeCoordinates}
        coordinateFormat="geojson"
        status={status}
        etaText={etaText}
        distanceText={distanceText}
        isLiveConnected={isLiveConnected}
        isGpsStale={isGpsStale}
        lastUpdateTimestamp={lastUpdateTimestamp}
        showControls={showControls}
        showEtaBadge={showEtaBadge}
        onRecenterPress={onRecenterPress}
        onMapLoaded={onMapLoaded}
        style={[{ flex: 1, width: '100%', height: '100%' }, style]}
      />
    );
  }
);

export default GoogleMapTracker;
