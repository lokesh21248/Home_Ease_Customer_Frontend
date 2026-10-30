import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMapView } from '../components/map/GoogleMapView';
import { useCustomerTracking } from '../hooks/useCustomerTracking';
import { Colors, Typography } from '../constants/theme';

export interface ActiveJobScreenProps {
  bookingId: string;
  customerToken?: string;
  customerLocation: {
    latitude: number;
    longitude: number;
  };
  onBackPress?: () => void;
}

export default function ActiveJobScreen({
  bookingId,
  customerToken,
  customerLocation,
  onBackPress,
}: ActiveJobScreenProps) {
  const { provider, error } = useCustomerTracking(
    bookingId,
    customerToken
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBackPress && (
          <Pressable style={styles.backBtn} onPress={onBackPress}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Google Map Viewport */}
      <View style={styles.mapContainer}>
        <GoogleMapView
          mode="tracking"
          initialRegion={{
            ...customerLocation,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
          }}
          customerLocation={customerLocation}
          providerLocation={
            provider
              ? {
                  latitude: provider.latitude,
                  longitude: provider.longitude,
                }
              : undefined
          }
          partnerBearing={provider?.bearing ?? 0}
          partnerName="Service Partner"
          hasPartnerLocation={!!provider}
          showControls={true}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.title}>Track your service partner</Text>

        {!provider && !error && (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="small" color={Colors.primary || '#2563EB'} />
            <Text style={styles.waitingText}>Connecting to tracking server...</Text>
          </View>
        )}

        {provider && (
          <View style={styles.providerInfoRow}>
            <View style={styles.providerDot} />
            <Text style={styles.updateText}>
              Partner GPS Active • Last update:{' '}
              {provider.timestamp
                ? new Date(provider.timestamp).toLocaleTimeString()
                : 'Just now'}
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
  },
  mapContainer: {
    height: 440,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  infoCard: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  waitingText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Typography.fontFamily.regular,
  },
  providerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  providerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  updateText: {
    fontSize: 13,
    color: '#334155',
    fontFamily: Typography.fontFamily.medium,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
  },
});
