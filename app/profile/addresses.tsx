/**
 * My Addresses & Add Address Screen
 * Route: /profile/addresses
 *
 * Fully integrated Address Management with:
 * - Interactive Leaflet & OpenStreetMap standard map with draggable pin
 * - Automatic device GPS detection via expo-location (services check, permissions, reverse geocode)
 * - Address search with autocomplete
 * - Granular fields: house/flat, building/floor, street, area, landmark, city, state, pincode
 * - Use Current Location button & Recenter button
 * - Form validation with clear error messages
 * - Real backend persistence to GET/POST/PUT/DELETE /api/v1/users/me/addresses
 * - Real latitude & longitude saved and displayed
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '../../src/context/CartContext';
import { useUserLocation } from '../../src/hooks/useUserLocation';
import { Colors, Typography, BorderRadius, Shadows } from '../../src/constants/theme';
import { userApi, bookingApi, Address } from '../../src/api/client';
import { useAddresses } from '../../src/hooks/useAddresses';
import { useAuth } from '../../src/context/AuthContext';
import { queryClient } from '../../src/query/queryClient';
import { queryKeys } from '../../src/query/queryKeys';
import {
  getCurrentLocation,
  reverseGeocodeLocation,
  requestLocationPermission,
  isLocationServicesEnabled,
  promptEnableLocationServices,
  searchLocations,
  getCentroidForPincode,
  UserLocationData,
} from '../../src/services/locationService';
import { GoogleMapAddressPicker } from '../../src/components/map/GoogleMapAddressPicker';
import { GoogleMapHandle } from '../../src/components/map/GoogleMapView';
import { isValidCoordinate } from '../../src/services/coordinates';

type AddressType = 'Home' | 'Office' | 'Other';

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const { setAddress } = useCart();
  const { selectLocation, location: userLocation, address: userAddress } = useUserLocation();
  const pickerMapRef = useRef<GoogleMapHandle>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Live PIN Code serviceability status state
  const [pinServiceStatus, setPinServiceStatus] = useState<{
    checking: boolean;
    serviceable: boolean | null;
    message?: string;
  }>({ checking: false, serviceable: null });

  // Address Form State
  const [titleType, setTitleType] = useState<AddressType>('Home');
  const [customTitle, setCustomTitle] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [building, setBuilding] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [stateName, setStateName] = useState('Telangana');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Coordinates state
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // GPS & Search states
  const [detectingGps, setDetectingGps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserLocationData[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchList, setShowSearchList] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const debounceSearchRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Fetch addresses from backend — cached via TanStack Query
  const { userId } = useAuth();
  const { data: addresses = [], isLoading: loading } = useAddresses();

  // Helper: invalidate the addresses cache so all consumers (ProfileScreen, etc.) update
  const invalidateAddresses = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.addresses(userId ?? '') });

  // Select address for booking flow — strictly enforces backend PIN code serviceability
  const handleSelectAddress = async (addr: Address) => {
    let rawPin = addr.pincode || '';
    if (!rawPin) {
      const match = `${addr.city || ''} ${addr.addressLine || ''}`.match(/\b\d{6}\b/);
      if (match) rawPin = match[0];
    }
    const cleanPin = rawPin.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      Alert.alert(
        'Location Not Serviceable',
        'This address is missing a verified 6-digit PIN code. Please edit it with an active PIN code to allow booking.'
      );
      return;
    }

    try {
      const check = await bookingApi.checkServiceability(cleanPin);
      if (!check.serviceable) {
        Alert.alert(
          'Location Not Serviceable',
          check.message || 'This address is outside our supported service areas. Bookings outside supported areas are not permitted.'
        );
        return;
      }
    } catch {
      Alert.alert(
        'Location Not Serviceable',
        'Unable to verify serviceability for this address. Bookings outside supported areas are not permitted.'
      );
      return;
    }

    let targetLat = addr.lat;
    let targetLng = addr.lng;
    if (!targetLat || !targetLng || (cleanPin === '500010' && Math.abs(targetLat - 17.4947) < 0.005)) {
      const centroid = getCentroidForPincode(cleanPin);
      targetLat = centroid.latitude;
      targetLng = centroid.longitude;
    }

    const updatedAddr: Address = {
      ...addr,
      pincode: cleanPin,
      lat: targetLat,
      lng: targetLng,
    };

    setAddress(updatedAddr);
    selectLocation({
      coordinates: { latitude: targetLat, longitude: targetLng },
      address: {
        formattedAddress: `${updatedAddr.addressLine}, ${updatedAddr.city}`,
        shortAddress: updatedAddr.title || updatedAddr.city,
        area: updatedAddr.addressLine,
        city: updatedAddr.city,
        state: updatedAddr.state || 'Telangana',
        pincode: cleanPin,
        addressLine: updatedAddr.addressLine,
        fullAddress: `${updatedAddr.title ? updatedAddr.title + ': ' : ''}${updatedAddr.addressLine}, ${updatedAddr.city}`,
      },
      isCustomSelected: true,
    });
    router.back();
  };

  // Open modal for new address
  const handleOpenAddModal = async () => {
    setEditingId(null);
    setTitleType('Home');
    setCustomTitle('');
    setHouseNumber('');
    setBuilding('');
    setStreet('');
    setArea('');
    setLandmark('');
    setCity('');
    setStateName('');
    setPincode('');
    setIsDefault(addresses.length === 0);
    setErrors({});
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchList(false);

    // Initial starting viewpoint: Use cached location from userLocation if available
    const startingCoords =
      userLocation && isValidCoordinate(userLocation.latitude, userLocation.longitude)
        ? userLocation
        : addresses.length > 0 && isValidCoordinate(addresses[0].lat, addresses[0].lng)
        ? { latitude: addresses[0].lat, longitude: addresses[0].lng }
        : null;

    if (startingCoords) {
      setCoords(startingCoords);
      if (userAddress) {
        if (userAddress.street) setStreet(userAddress.street);
        if (userAddress.area) setArea(userAddress.area);
        if (userAddress.city) setCity(userAddress.city);
        if (userAddress.state) setStateName(userAddress.state);
        if (userAddress.pincode) setPincode(userAddress.pincode);
      }
    } else {
      setCoords(null);
    }

    setModalVisible(true);

    // Automatically trigger GPS detection for convenience
    detectCurrentLocationAuto(false);
  };

  // Open modal for editing existing address
  const handleOpenEditModal = (addr: Address) => {
    setEditingId(addr.id);
    const isStandard = ['Home', 'Office'].includes(addr.title);
    setTitleType(isStandard ? (addr.title as AddressType) : 'Other');
    setCustomTitle(isStandard ? '' : addr.title);

    // Split line if possible
    const parts = addr.addressLine.split(',').map((p) => p.trim());
    setHouseNumber(parts[0] || '');
    setStreet(parts[1] || parts[0] || '');
    setArea(parts[2] || '');
    setBuilding('');
    setLandmark('');
    setCity(addr.city ? addr.city.replace(/\s*-\s*\d{6}$/, '').trim() : 'Hyderabad');
    setStateName(addr.state || 'Telangana');
    setPincode(addr.pincode ? addr.pincode.replace(/\D/g, '') : '');
    setIsDefault(addr.isDefault || false);
    setCoords(
      isValidCoordinate(addr.lat, addr.lng)
        ? { latitude: addr.lat, longitude: addr.lng }
        : null,
    );
    setErrors({});
    setSearchQuery('');
    setShowSearchList(false);
    setModalVisible(true);
  };

  // 2. Automatically detect GPS current location
  const detectCurrentLocationAuto = async (forceAlert = false) => {
    setDetectingGps(true);
    try {
      // Step 1: Check services
      const servicesOn = await isLocationServicesEnabled();
      if (!servicesOn) {
        if (forceAlert) {
          promptEnableLocationServices();
        }
        setDetectingGps(false);
        return;
      }

      // Step 2: Request permission
      const { granted } = await requestLocationPermission();
      if (!granted) {
        if (forceAlert) {
          Alert.alert(
            'Permission Denied',
            'Location access was denied. You can manually search or pin your address on the map.'
          );
        }
        setDetectingGps(false);
        return;
      }

      // Step 3: Get current GPS position
      const gpsCoords = await getCurrentLocation();
      if (!gpsCoords) {
        if (forceAlert) {
          Alert.alert('GPS Notice', 'Unable to acquire accurate GPS fix. Please select your location on the map.');
        }
        setDetectingGps(false);
        return;
      }

      // Step 4: Update coordinates state & recenter map
      setCoords(gpsCoords);
      pickerMapRef.current?.recenterToCustomerGps();

      // Step 5: Reverse geocode to populate address form
      const geo = await reverseGeocodeLocation(gpsCoords);
      if (geo.houseNumber) setHouseNumber(geo.houseNumber);
      if (geo.building) setBuilding(geo.building);
      if (geo.street) setStreet(geo.street);
      if (geo.area) setArea(geo.area);
      if (geo.city) setCity(geo.city);
      if (geo.state) setStateName(geo.state);
      if (geo.pincode) {
        void handlePincodeChange(geo.pincode);
      }
    } catch (err: any) {
      console.log('[AddressesScreen] detectCurrentLocationAuto notice:', err);
      if (forceAlert) {
        Alert.alert('Location Error', err?.message || 'Could not fetch current GPS location.');
      }
    } finally {
      setDetectingGps(false);
    }
  };

  // 3. User moved pin on map
  const handleMapCoordinatesChange = async (newCoords: { latitude: number; longitude: number }) => {
    setCoords(newCoords);
    try {
      const geo = await reverseGeocodeLocation(newCoords);
      if (geo.street && !street) setStreet(geo.street);
      if (geo.area) setArea(geo.area);
      if (geo.city) setCity(geo.city);
      if (geo.state) setStateName(geo.state);
      if (geo.pincode && !pincode) {
        void handlePincodeChange(geo.pincode);
      }
    } catch {}
  };

  // 4. Search locations manually
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      setShowSearchList(false);
      return;
    }

    if (debounceSearchRef.current) clearTimeout(debounceSearchRef.current);
    debounceSearchRef.current = setTimeout(async () => {
      setSearching(true);
      setShowSearchList(true);
      try {
        const results = await searchLocations(text);
        setSearchResults(results);
      } catch (err) {
        console.warn('[AddressesScreen] search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  // Pick search result
  const handleSelectSearchResult = (item: UserLocationData) => {
    setCoords({
      latitude: item.coordinates.latitude,
      longitude: item.coordinates.longitude,
    });
    if (item.address.street) setStreet(item.address.street);
    if (item.address.area) setArea(item.address.area);
    if (item.address.city) setCity(item.address.city);
    if (item.address.state) setStateName(item.address.state);
    if (item.address.pincode) {
      void handlePincodeChange(item.address.pincode);
    }

    setSearchQuery('');
    setSearchResults([]);
    setShowSearchList(false);
  };

  // Handle PIN code input and live backend check
  const handlePincodeChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);
    setErrors((prev) => ({ ...prev, pincode: '' }));

    if (cleaned.length === 6) {
      setPinServiceStatus({ checking: true, serviceable: null });
      try {
        const check = await bookingApi.checkServiceability(cleaned);
        setPinServiceStatus({
          checking: false,
          serviceable: check.serviceable,
          message: check.serviceable ? 'Serviceable' : 'Location Not Serviceable',
        });
      } catch {
        setPinServiceStatus({
          checking: false,
          serviceable: false,
          message: 'Location Not Serviceable',
        });
      }
    } else {
      setPinServiceStatus({ checking: false, serviceable: null });
    }
  };

  // 5. Validate & Save address
  const handleSaveAddress = async () => {
    const newErrors: Record<string, string> = {};

    if (!houseNumber.trim()) newErrors.houseNumber = 'House / Flat number is required';
    if (!street.trim()) newErrors.street = 'Street or road name is required';
    if (!area.trim()) newErrors.area = 'Area or locality is required';
    if (!city.trim()) newErrors.city = 'City is required';

    const cleanedPin = pincode.replace(/\D/g, '');
    if (cleanedPin.length !== 6) {
      newErrors.pincode = 'A valid 6-digit Indian PIN code is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert(
        newErrors.pincode ? 'Location Not Serviceable' : 'Incomplete Address',
        newErrors.pincode
          ? 'Please provide a valid 6-digit PIN code for this address.'
          : 'Please fill in the required fields marked with *'
      );
      return;
    }

    const selectedCoordinates = coords;
    if (
      !selectedCoordinates ||
      !isValidCoordinate(selectedCoordinates.latitude, selectedCoordinates.longitude)
    ) {
      setErrors({ location: 'Select an address location using GPS, search, or the map.' });
      Alert.alert('Location Required', 'Select a valid location before saving this address.');
      return;
    }

    setSaving(true);
    setErrors({});

    // Verify backend serviceability before saving
    try {
      const check = await bookingApi.checkServiceability(cleanedPin);
      if (!check.serviceable) {
        setSaving(false);
        Alert.alert(
          'Location Not Serviceable',
          check.message || `FirstDoor is not currently active in PIN code ${cleanedPin}. Bookings outside supported areas are not permitted.`
        );
        return;
      }
    } catch {
      setSaving(false);
      Alert.alert(
        'Location Not Serviceable',
        `Unable to verify service availability in PIN code ${cleanedPin}. Bookings outside supported areas are not permitted.`
      );
      return;
    }

    // Construct full formatted address line
    const addressParts = [
      houseNumber.trim(),
      building.trim(),
      street.trim(),
      landmark.trim() ? `Near ${landmark.trim()}` : '',
      area.trim(),
    ].filter(Boolean);

    const fullLine = addressParts.join(', ');
    const title = titleType === 'Other' && customTitle.trim() ? customTitle.trim() : titleType;

    const payload = {
      title,
      addressLine: fullLine,
      city: city.trim(),
      state: stateName.trim() || 'Telangana',
      pincode: cleanedPin,
      lat: selectedCoordinates.latitude,
      lng: selectedCoordinates.longitude,
      isDefault: isDefault || addresses.length === 0,
    };

    try {
      let saved: Address;
      if (editingId) {
        saved = await userApi.updateAddress(editingId, payload);
      } else {
        saved = await userApi.addAddress(payload);
      }

      const effectiveAddr: Address = {
        ...payload,
        id: saved?.id || editingId || `addr-${Date.now()}`,
        userId: saved?.userId || '',
      };

      setAddress(effectiveAddr);
      selectLocation({
        coordinates: { latitude: effectiveAddr.lat, longitude: effectiveAddr.lng },
        address: {
          formattedAddress: `${effectiveAddr.addressLine}, ${effectiveAddr.city}`,
          shortAddress: effectiveAddr.title || effectiveAddr.city,
          area: effectiveAddr.addressLine,
          city: effectiveAddr.city,
          state: effectiveAddr.state || 'Telangana',
          pincode: cleanedPin,
          addressLine: effectiveAddr.addressLine,
          fullAddress: `${effectiveAddr.title ? effectiveAddr.title + ': ' : ''}${effectiveAddr.addressLine}, ${effectiveAddr.city}`,
        },
        isCustomSelected: true,
      });

      setModalVisible(false);
      // Invalidate cache so ProfileScreen address count and this list both update
      await invalidateAddresses();
      Alert.alert(
        'Address Saved',
        editingId ? 'Address updated successfully!' : 'Address saved and selected for booking!',
        [
          { text: 'Use for Booking', onPress: () => router.back() },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      console.warn('[AddressesScreen] Save address error:', err);
      Alert.alert('Save Failed', err?.message || 'Unable to save address to server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // 6. Delete address
  const handleDeleteAddress = (id: string, title: string) => {
    Alert.alert('Delete Address', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await userApi.deleteAddress(id);
            // Invalidate cache so ProfileScreen address count and this list both update
            await invalidateAddresses();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete address.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Screen Header with White Safe Area Fill */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>My Addresses</Text>
          <Pressable style={styles.headerAddBtn} onPress={handleOpenAddModal} accessibilityLabel="Add Address">
            <Ionicons name="add" size={24} color={Colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Saved Address List */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading saved addresses...</Text>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 40 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="location-outline" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No saved addresses yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your home or office address with live map pin to get services delivered seamlessly.
              </Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAddModal}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyAddBtnText}>Add New Address</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const isHome = item.title?.toLowerCase().includes('home');
            const isOffice = item.title?.toLowerCase().includes('office');
            const iconName = isHome ? 'home-outline' : isOffice ? 'business-outline' : 'location-outline';

            return (
              <Pressable style={styles.card} onPress={() => handleSelectAddress(item)}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name={iconName as any} size={22} color={Colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.isDefault && <View style={styles.defaultTag}><Text style={styles.defaultTagText}>Default</Text></View>}
                  </View>
                  <Text style={styles.cardLine} numberOfLines={2}>
                    {item.addressLine}
                  </Text>
                  <Text style={styles.cardCity}>{item.city}</Text>
                  <View style={styles.coordsRow}>
                    <Ionicons name="navigate-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.coordsText}>
                      GPS: {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </Text>
                  </View>
                </View>

                {/* Actions: Edit & Delete */}
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.cardActionBtn}
                    onPress={() => handleOpenEditModal(item)}
                    accessibilityLabel="Edit address"
                  >
                    <Ionicons name="pencil-outline" size={18} color="#4B5563" />
                  </Pressable>
                  <Pressable
                    style={styles.cardActionBtn}
                    onPress={() => handleDeleteAddress(item.id, item.title)}
                    accessibilityLabel="Delete address"
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Floating Bottom Add Button */}
      {addresses.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal} activeOpacity={0.88}>
            <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>+ Add New Address</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── ADD / EDIT ADDRESS MODAL ─── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalScreen, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Pressable style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </Pressable>
            <Text style={styles.modalHeaderTitle}>
              {editingId ? 'Edit Address' : 'Add Delivery Address'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Google Maps with Draggable Pin */}
            <View style={styles.mapSection}>
              <GoogleMapAddressPicker
                ref={pickerMapRef}
                initialLat={coords?.latitude}
                initialLng={coords?.longitude}
                onCoordinatesChange={handleMapCoordinatesChange}
                onRecenterPress={() => detectCurrentLocationAuto(true)}
                isDetectingGps={detectingGps}
              />
            </View>

            {/* 2. Selected Location Bottom Panel / Card (Requirement 3) */}
            <View style={styles.selectedLocationCard}>
              <View style={styles.selectedLocationHeader}>
                <View style={styles.selectedLocationIconWrap}>
                  <Ionicons name="location" size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedLocationTitle} numberOfLines={1}>
                    {area || city || (detectingGps ? 'Locating your address...' : 'Delivery Location')}
                  </Text>
                  <Text style={styles.selectedLocationSub} numberOfLines={2}>
                    {[houseNumber, building, street, area, city, stateName, pincode].filter(Boolean).join(', ') ||
                      (coords
                        ? 'Doorstep location marked. Fine-tune by dragging map.'
                        : 'Move the map or tap "Locate Me" to pinpoint delivery doorstep')}
                  </Text>
                </View>
              </View>

              {coords && (
                <View style={styles.selectedLocationMetaRow}>
                  <View style={styles.coordsBadge}>
                    <Ionicons name="navigate-circle" size={13} color={Colors.primary} />
                    <Text style={styles.coordsBadgeText}>
                      GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                    </Text>
                  </View>
                  <Text style={styles.dragPinHintText}>
                    📍 Center pin sets delivery spot
                  </Text>
                </View>
              )}
            </View>

            {/* 3. Action: Locate Me Button (Requirement 2) */}
            <TouchableOpacity
              style={styles.gpsActionBtn}
              onPress={() => detectCurrentLocationAuto(true)}
              disabled={detectingGps}
              activeOpacity={0.85}
            >
              {detectingGps ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color={Colors.primary} />
              )}
              <Text style={styles.gpsActionBtnText}>
                {detectingGps ? 'Acquiring GPS Position...' : 'Locate Me (Current GPS)'}
              </Text>
            </TouchableOpacity>

            {/* 3. Search Address Input */}
            <View style={styles.searchWrap}>
              <View style={styles.searchInputRow}>
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search street, area, or landmark..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => handleSearchChange('')}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </Pressable>
                )}
              </View>

              {/* Search Suggestions Dropdown */}
              {showSearchList && (
                <View style={styles.suggestionsBox}>
                  {searching ? (
                    <View style={styles.searchLoadingRow}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.searchLoadingText}>Searching locations...</Text>
                    </View>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item, idx) => (
                      <Pressable
                        key={`sr-${idx}`}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectSearchResult(item)}
                      >
                        <Ionicons name="location-outline" size={18} color={Colors.primary} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionTitle}>{item.address.shortAddress || item.address.area}</Text>
                          <Text style={styles.suggestionSub} numberOfLines={1}>
                            {item.address.fullAddress || item.address.formattedAddress}
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={styles.noResultsText}>No places found</Text>
                  )}
                </View>
              )}
            </View>

            {/* 4. Address Type Selector */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Save Address As</Text>
              <View style={styles.typeRow}>
                {(['Home', 'Office', 'Other'] as AddressType[]).map((t) => {
                  const isSelected = titleType === t;
                  const icon = t === 'Home' ? '🏠' : t === 'Office' ? '🏢' : '📍';
                  return (
                    <Pressable
                      key={t}
                      style={[styles.typeBtn, isSelected && styles.typeBtnActive]}
                      onPress={() => setTitleType(t)}
                    >
                      <Text style={styles.typeIcon}>{icon}</Text>
                      <Text style={[styles.typeBtnText, isSelected && styles.typeBtnTextActive]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {titleType === 'Other' && (
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  placeholder="e.g. Parents' House, Villa 4"
                  placeholderTextColor="#9CA3AF"
                  value={customTitle}
                  onChangeText={setCustomTitle}
                />
              )}
            </View>

            {/* 5. Detailed Address Form Fields */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Address Details</Text>

              {/* House / Flat Number */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>
                  House / Flat / Door No. <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.houseNumber && styles.inputError]}
                  placeholder="e.g. Flat 402, Door 12-3/A"
                  placeholderTextColor="#9CA3AF"
                  value={houseNumber}
                  onChangeText={(t) => {
                    setHouseNumber(t);
                    setErrors((prev) => ({ ...prev, houseNumber: '' }));
                  }}
                />
                {errors.houseNumber ? <Text style={styles.errorText}>{errors.houseNumber}</Text> : null}
              </View>

              {/* Apartment / Building Name */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Apartment / Building / Society</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Green Valley Heights, Tower 2"
                  placeholderTextColor="#9CA3AF"
                  value={building}
                  onChangeText={setBuilding}
                />
              </View>

              {/* Street / Road */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>
                  Street / Road Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.street && styles.inputError]}
                  placeholder="e.g. Road No. 36, Cyber Hills Main Road"
                  placeholderTextColor="#9CA3AF"
                  value={street}
                  onChangeText={(t) => {
                    setStreet(t);
                    setErrors((prev) => ({ ...prev, street: '' }));
                  }}
                />
                {errors.street ? <Text style={styles.errorText}>{errors.street}</Text> : null}
              </View>

              {/* Area / Locality */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>
                  Area / Locality <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.area && styles.inputError]}
                  placeholder="e.g. Madhapur, Kukatpally, Gachibowli"
                  placeholderTextColor="#9CA3AF"
                  value={area}
                  onChangeText={(t) => {
                    setArea(t);
                    setErrors((prev) => ({ ...prev, area: '' }));
                  }}
                />
                {errors.area ? <Text style={styles.errorText}>{errors.area}</Text> : null}
              </View>

              {/* Landmark */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Landmark (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Near Metro Pillar 12, Behind Apollo Pharmacy"
                  placeholderTextColor="#9CA3AF"
                  value={landmark}
                  onChangeText={setLandmark}
                />
              </View>

              {/* City & State Row */}
              <View style={styles.twoColRow}>
                <View style={[styles.fieldRow, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>
                    City <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, errors.city && styles.inputError]}
                    placeholder="e.g. Hyderabad"
                    placeholderTextColor="#9CA3AF"
                    value={city}
                    onChangeText={(t) => {
                      setCity(t);
                      setErrors((prev) => ({ ...prev, city: '' }));
                    }}
                  />
                  {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
                </View>

                <View style={[styles.fieldRow, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>State</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Telangana"
                    placeholderTextColor="#9CA3AF"
                    value={stateName}
                    onChangeText={setStateName}
                  />
                </View>
              </View>

              {/* PIN Code */}
              <View style={styles.fieldRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>
                    PIN Code (6 digits) <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  {pinServiceStatus.checking ? (
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>Checking...</Text>
                  ) : pinServiceStatus.serviceable === true ? (
                    <Text style={{ fontSize: 11, color: '#059669', fontWeight: 'bold' }}>✓ Serviceable Area</Text>
                  ) : pinServiceStatus.serviceable === false ? (
                    <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: 'bold' }}>⚠️ Location Not Serviceable</Text>
                  ) : null}
                </View>
                <TextInput
                  style={[styles.input, errors.pincode && styles.inputError]}
                  placeholder="e.g. 500072"
                  placeholderTextColor="#9CA3AF"
                  value={pincode}
                  onChangeText={handlePincodeChange}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {errors.pincode ? <Text style={styles.errorText}>{errors.pincode}</Text> : null}
              </View>

              {/* Set as Default Switch */}
              <Pressable style={styles.checkboxRow} onPress={() => setIsDefault(!isDefault)}>
                <View style={[styles.checkbox, isDefault && styles.checkboxActive]}>
                  {isDefault && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Set as default delivery address</Text>
              </Pressable>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Modal Footer / Save CTA */}
          <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveAddress}
              disabled={saving}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{editingId ? 'Update Address' : 'Save Address'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  headerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 110,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 14,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    gap: 6,
    marginTop: 6,
    ...Shadows.sm,
  },
  emptyAddBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    ...Shadows.sm,
    gap: 12,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  defaultTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultTagText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    color: '#059669',
  },
  cardLine: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardCity: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  coordsText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  cardActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    ...Shadows.md,
  },
  addBtn: {
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.blue,
  },
  addBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },

  // Modal Styles
  modalScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    gap: 16,
  },
  mapSection: {
    height: 280,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  selectedLocationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
    gap: 10,
  },
  selectedLocationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  selectedLocationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  selectedLocationTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  selectedLocationSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  selectedLocationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  coordsBadgeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11,
    color: Colors.primary,
  },
  dragPinHintText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  gpsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    gap: 8,
  },
  gpsActionBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.primary,
  },

  // Search Section
  searchWrap: {
    position: 'relative',
    zIndex: 30,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  suggestionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadows.md,
    maxHeight: 180,
    overflow: 'hidden',
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  searchLoadingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  suggestionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  suggestionSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  noResultsText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    padding: 12,
    textAlign: 'center',
  },

  // Form Section
  formSection: {
    gap: 12,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  typeBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: Colors.primary,
  },
  typeIcon: {
    fontSize: 16,
  },
  typeBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  typeBtnTextActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  fieldRow: {
    gap: 4,
  },
  fieldLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  requiredStar: {
    color: '#EF4444',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#EF4444',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    ...Shadows.md,
  },
  saveBtn: {
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.blue,
  },
  saveBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
