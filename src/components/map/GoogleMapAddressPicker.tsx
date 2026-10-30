/**
 * GoogleMapAddressPicker — Interactive Google Maps Delivery Address Picker
 * High-performance native Google Maps delivery address picker.
 *
 * Features:
 * - Native Google Maps with PROVIDER_GOOGLE on Android
 * - Centered delivery location pin with physics bounce/lift on movestart and moveend
 * - Camera pan/move reports updated coordinates to React Native
 * - Recenter button to jump back to current GPS position
 * - Zoom in / out controls
 * - Fully compatible with Expo SDK 57 on Android and iOS
 */

import React, { forwardRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { GoogleMapView, GoogleMapHandle } from './GoogleMapView';

export interface GoogleMapAddressPickerProps {
  initialLat?: number;
  initialLng?: number;
  onCoordinatesChange: (coords: { latitude: number; longitude: number }) => void;
  onRecenterPress?: () => void;
  isDetectingGps?: boolean;
  onMapLoaded?: () => void;
  onError?: (err: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const GoogleMapAddressPicker = forwardRef<GoogleMapHandle, GoogleMapAddressPickerProps>(
  function GoogleMapAddressPicker(
    {
      initialLat,
      initialLng,
      onCoordinatesChange,
      onRecenterPress,
      isDetectingGps = false,
      onMapLoaded,
      onError,
      style,
    }: GoogleMapAddressPickerProps,
    ref
  ) {
    return (
      <GoogleMapView
        ref={ref}
        mode="picker"
        initialLat={initialLat}
        initialLng={initialLng}
        customerLat={initialLat}
        customerLng={initialLng}
        initialZoom={16}
        showCenterPin={true}
        centerPinLabel="Delivery Location"
        onCoordinatesChange={onCoordinatesChange}
        onRecenterPress={onRecenterPress}
        isDetectingGps={isDetectingGps}
        showControls={true}
        onMapLoaded={onMapLoaded}
        onError={onError}
        style={[{ width: '100%', height: 280 }, style]}
      />
    );
  }
);

export default GoogleMapAddressPicker;
