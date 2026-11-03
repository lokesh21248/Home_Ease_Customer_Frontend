import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMapView, GoogleMapHandle, MapPoint } from '../components/map/GoogleMapView';
import { useCustomerLocation } from '../hooks/useCustomerLocation';
import { searchAddresses, reverseGeocode, GeoSearchResult } from '../api/geoApi';
import { saveAddress, AddressLabel } from '../api/addressApi';
import { bookingApi } from '../api/client';
import { promptEnableLocationServices } from '../services/locationService';
import { Colors, Typography, Shadows } from '../constants/theme';

export interface AddDeliveryAddressProps {
  initialCoordinates?: MapPoint;
  customerToken?: string;
  onAddressSaved?: (savedAddress: any) => void;
  onCancel?: () => void;
}

export default function AddDeliveryAddress({
  initialCoordinates,
  customerToken,
  onAddressSaved,
  onCancel,
}: AddDeliveryAddressProps) {
  const mapRef = useRef<GoogleMapHandle>(null);
  const { loading: gpsLoading, locateMe } = useCustomerLocation();

  const [selectedPoint, setSelectedPoint] = useState<MapPoint>(
    initialCoordinates || { latitude: 17.4485, longitude: 78.3748 }
  );

  const [formattedAddress, setFormattedAddress] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [landmark, setLandmark] = useState('');
  const [label, setLabel] = useState<AddressLabel>('HOME');
  const [pincode, setPincode] = useState('');
  const [pinServiceStatus, setPinServiceStatus] = useState<{
    checking: boolean;
    serviceable: boolean | null;
    message?: string;
  }>({ checking: false, serviceable: null });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Debounced address search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (text.trim().length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchAddresses(text.trim(), customerToken);
        setSearchResults(results);
        setShowSearchResults(results.length > 0);
      } catch (e) {
        console.warn('[AddDeliveryAddress] search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const checkPinServiceability = async (pin: string) => {
    const clean = pin.replace(/\D/g, '').slice(0, 6);
    if (clean.length !== 6) {
      setPinServiceStatus({ checking: false, serviceable: null });
      return;
    }
    setPinServiceStatus({ checking: true, serviceable: null });
    try {
      const res = await bookingApi.checkServiceability(clean);
      setPinServiceStatus({
        checking: false,
        serviceable: res.serviceable,
        message: res.serviceable ? 'Serviceable' : 'Location Not Serviceable',
      });
    } catch {
      setPinServiceStatus({
        checking: false,
        serviceable: false,
        message: 'Location Not Serviceable',
      });
    }
  };

  const handlePincodeChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);
    void checkPinServiceability(cleaned);
  };

  const handleSelectSearchResult = (result: GeoSearchResult) => {
    const pt: MapPoint = { latitude: result.latitude, longitude: result.longitude };
    setSelectedPoint(pt);
    setFormattedAddress(result.formattedAddress);
    setShowSearchResults(false);
    setSearchQuery('');
    mapRef.current?.animateToCoordinate?.(pt, 500);

    const pinMatch = result.formattedAddress.match(/\b\d{6}\b/);
    if (pinMatch) {
      setPincode(pinMatch[0]);
      void checkPinServiceability(pinMatch[0]);
    }
  };

  // Reverse geocode whenever map moves
  const handleMapMoved = useCallback(
    async (point: MapPoint) => {
      setSelectedPoint(point);
      setIsReverseGeocoding(true);
      try {
        const geo = await reverseGeocode(point, customerToken);
        if (geo?.formattedAddress) {
          setFormattedAddress(geo.formattedAddress);
          const pinMatch = geo.formattedAddress.match(/\b\d{6}\b/);
          if (pinMatch) {
            setPincode(pinMatch[0]);
            void checkPinServiceability(pinMatch[0]);
          }
        }
      } catch (e) {
        console.warn('[AddDeliveryAddress] reverse geocode error:', e);
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [customerToken]
  );

  // Initial reverse geocode if no address set
  useEffect(() => {
    if (!formattedAddress && selectedPoint) {
      handleMapMoved(selectedPoint);
    }
  }, []);

  const handleLocateMe = async () => {
    try {
      const pt = await locateMe();
      if (pt) {
        setSelectedPoint(pt);
        mapRef.current?.recenterToCustomerGps();
        await handleMapMoved(pt);
      } else {
        promptEnableLocationServices();
      }
    } catch {
      promptEnableLocationServices();
    }
  };

  const handleSave = async () => {
    if (!formattedAddress.trim()) {
      Alert.alert('Required Field', 'Please select or search a delivery address on the map.');
      return;
    }

    const cleanPin = pincode.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      Alert.alert(
        'Location Not Serviceable',
        'A valid 6-digit PIN code is required. Bookings outside supported areas are not permitted.'
      );
      return;
    }

    setIsSaving(true);
    try {
      // Backend check whether PIN code is active
      const check = await bookingApi.checkServiceability(cleanPin);
      if (!check.serviceable) {
        setIsSaving(false);
        Alert.alert(
          'Location Not Serviceable',
          check.message || `PIN code ${cleanPin} is outside our supported service areas. Bookings outside supported areas are not permitted.`
        );
        return;
      }

      const saved = await saveAddress(
        {
          formattedAddress: formattedAddress.trim(),
          latitude: selectedPoint.latitude,
          longitude: selectedPoint.longitude,
          houseNumber: houseNumber.trim() || undefined,
          landmark: landmark.trim() || undefined,
          label,
          pincode: cleanPin,
        },
        customerToken
      );

      Alert.alert('Address Saved', 'Your delivery address has been saved successfully.', [
        { text: 'OK', onPress: () => onAddressSaved?.(saved) },
      ]);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Unable to save address to server. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        {onCancel && (
          <Pressable style={styles.headerBtn} onPress={onCancel}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>Add Delivery Address</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search street, area, locality..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {isSearching && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>

        {/* Autocomplete Search Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <View style={styles.dropdownContainer}>
            {searchResults.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dropdownItem}
                onPress={() => handleSelectSearchResult(item)}
              >
                <Ionicons name="location-outline" size={18} color={Colors.primary} />
                <Text style={styles.dropdownText} numberOfLines={2}>
                  {item.formattedAddress}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Google Map Viewport with Center Pin */}
        <View style={styles.mapWrap}>
          <GoogleMapView
            ref={mapRef}
            mode="picker"
            initialLat={selectedPoint.latitude}
            initialLng={selectedPoint.longitude}
            initialZoom={16}
            showCenterPin={true}
            centerPinLabel="Delivery Spot"
            onMapMoved={handleMapMoved}
            style={styles.map}
          />

          {/* Locate Me Floating Button */}
          <TouchableOpacity
            style={styles.locateBtn}
            onPress={handleLocateMe}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="locate" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Address Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={22} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Selected Location</Text>
              <Text style={styles.cardAddress} numberOfLines={2}>
                {isReverseGeocoding ? 'Detecting address details...' : formattedAddress || 'Drag map to choose location'}
              </Text>
            </View>
          </View>

          {/* Label Selector: Home, Office, Other */}
          <Text style={styles.inputLabel}>SAVE ADDRESS AS</Text>
          <View style={styles.labelRow}>
            {(['HOME', 'OFFICE', 'OTHER'] as AddressLabel[]).map((type) => {
              const active = label === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.labelChip, active && styles.labelChipActive]}
                  onPress={() => setLabel(type)}
                >
                  <Ionicons
                    name={
                      type === 'HOME'
                        ? 'home'
                        : type === 'OFFICE'
                        ? 'business'
                        : 'bookmark'
                    }
                    size={16}
                    color={active ? '#FFFFFF' : '#475569'}
                  />
                  <Text style={[styles.labelText, active && styles.labelTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* House / Flat Number */}
          <Text style={styles.inputLabel}>HOUSE / FLAT / BLOCK NO.</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Flat 302, Green Tower"
            placeholderTextColor="#94A3B8"
            value={houseNumber}
            onChangeText={setHouseNumber}
          />

          {/* Landmark */}
          <Text style={styles.inputLabel}>LANDMARK (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Near Metro Station / Apollo Pharmacy"
            placeholderTextColor="#94A3B8"
            value={landmark}
            onChangeText={setLandmark}
          />

          {/* 6-Digit PIN Code */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.inputLabel}>PIN CODE (6 DIGITS) *</Text>
            {pinServiceStatus.checking ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : pinServiceStatus.serviceable === true ? (
              <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.semiBold, color: '#16A34A' }}>
                ✓ Serviceable Area
              </Text>
            ) : pinServiceStatus.serviceable === false ? (
              <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.semiBold, color: '#DC2626' }}>
                ⚠️ Location Not Serviceable
              </Text>
            ) : null}
          </View>
          <TextInput
            style={[
              styles.input,
              pinServiceStatus.serviceable === false && { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
              pinServiceStatus.serviceable === true && { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
            ]}
            placeholder="Enter 6-digit PIN code (e.g. 500072)"
            placeholderTextColor="#94A3B8"
            value={pincode}
            onChangeText={handlePincodeChange}
            keyboardType="number-pad"
            maxLength={6}
          />

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Address</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBtn: {
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: '#0F172A',
  },
  dropdownContainer: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontFamily: Typography.fontFamily.regular,
  },
  mapWrap: {
    height: 280,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
    ...Shadows.md,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  locateBtn: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
  },
  cardAddress: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#64748B',
    marginBottom: 8,
    marginTop: 12,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  labelChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labelChipActive: {
    backgroundColor: Colors.primary || '#2563EB',
    borderColor: Colors.primary || '#2563EB',
  },
  labelText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
  },
  labelTextActive: {
    color: '#FFFFFF',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: Typography.fontFamily.regular,
    backgroundColor: '#F8FAFC',
  },
  saveBtn: {
    marginTop: 20,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary || '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
