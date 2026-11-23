/**
 * CustomerHomeMarker.tsx
 *
 * Premium HomeEase Customer Destination Marker for Google Maps.
 *
 * Requirements:
 * - Premium circular blue pin head (#2563EB)
 * - White home icon inside
 * - Ground-pointing needle tip with contact shadow
 * - Positioned strictly at the booking's saved customer service coordinates
 * - Remains fixed while the service partner travels
 * - Top label: "Customer Destination"
 * - Zero CPU overhead with tracksViewChanges={false}
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { isValidCoordinate, LatLngCoordinate } from '../../services/coordinates';
import { Typography } from '../../constants/theme';

export interface CustomerHomeMarkerProps {
  coordinate: LatLngCoordinate;
  title?: string;
  address?: string;
  label?: string;
  zIndex?: number;
}

export const CustomerHomeMarker: React.FC<CustomerHomeMarkerProps> = memo(
  function CustomerHomeMarker({
    coordinate,
    title,
    address,
    label = 'Customer Destination',
    zIndex = 30,
  }) {
    if (!isValidCoordinate(coordinate.latitude, coordinate.longitude)) {
      return null;
    }

    return (
      <Marker
        coordinate={{
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        }}
        title={title || label}
        description={address}
        anchor={{ x: 0.5, y: 1.0 }}
        centerOffset={{ x: 0, y: 0 }}
        zIndex={zIndex}
        tracksViewChanges={false}
        identifier="homeease-customer-destination"
      >
        <View collapsable={false} style={styles.container}>
          {/* Top Label Pill */}
          <View style={styles.labelPill}>
            <View style={styles.labelDot} />
            <Text style={styles.labelText} numberOfLines={1}>
              {label}
            </Text>
          </View>

          {/* Circular Pin Head */}
          <View style={styles.pinCircle}>
            <Ionicons name="home" size={17} color="#FFFFFF" />
          </View>

          {/* Ground-Pointing Needle Tip */}
          <View style={styles.pinTip} />

          {/* Ground Contact Shadow */}
          <View style={styles.groundShadow} />
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
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
    marginRight: 5,
  },
  labelText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#1E3A8A',
    letterSpacing: 0.2,
  },
  pinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2563EB',
    marginTop: -1,
  },
  groundShadow: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    marginTop: 1,
  },
});

export default CustomerHomeMarker;
