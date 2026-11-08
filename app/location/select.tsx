/**
 * Location Selection Screen
 * Route: /location/select
 *
 * Options:
 * 1. Use my current location (GPS with reverse-geocoding & backend serviceability check)
 * 2. Search location (debounced 300ms, Google/backend proxy geocoding)
 * 3. Select popular Hyderabad localities (Kukatpally, Jubilee Hills, Gachibowli, etc.)
 * 4. Select saved address
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  MapPin,
  Search,
  Navigation,
  ChevronLeft,
  X,
  Home,
  Briefcase,
  Plus,
  Check,
  CheckCircle2,
  AlertTriangle,
  Hash,
  ArrowRight,
} from 'lucide-react-native';
import { useUserLocation } from '../../src/hooks/useUserLocation';
import {
  searchLocations,
  UserLocationData,
  PRESET_LOCALITIES,
  getCentroidForPincode,
  isLocationServicesEnabled,
  getCurrentLocation,
  reverseGeocodeLocation,
} from '../../src/services/locationService';
import { userApi, bookingApi, Address } from '../../src/api/client';
import { Colors, Typography } from '../../src/constants/theme';
import { useCart } from '../../src/context/CartContext';
import { getHeaderTopPadding } from '../../src/constants/layout';

export default function LocationSelectScreen() {
  const insets = useSafeAreaInsets();
  const { address, refreshLocation, selectLocation } = useUserLocation();
  const { setAddress: setCartAddress } = useCart();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserLocationData[]>([]);
  const [searching, setSearching] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [verifyingServiceability, setVerifyingServiceability] = useState(false);

  // Dedicated 6-Digit PIN Code State
  const [pinInput, setPinInput] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);
  const [pinResult, setPinResult] = useState<{
    pincode: string;
    serviceable: boolean;
    city?: string | null;
    state?: string | null;
    areaName?: string | null;
    message: string;
  } | null>(null);
  const pinInputRef = useRef<TextInputInstance | null>(null);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const debounceTimeout = useRef<any>(null);

  // Fetch saved addresses from backend
  useEffect(() => {
    let isMounted = true;
    async function loadAddresses() {
      setLoadingSaved(true);
      try {
        const list = await userApi.getAddresses();
        if (isMounted) {
          setSavedAddresses(list || []);
        }
      } catch {
        if (isMounted) {
          setSavedAddresses([]);
        }
      } finally {
        if (isMounted) {
          setLoadingSaved(false);
        }
      }
    }
    loadAddresses();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle 6-digit PIN input change
  const handlePinInputChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setPinInput(cleaned);
    if (pinResult) setPinResult(null);

    if (cleaned.length === 6) {
      void verifyPincode(cleaned);
    }
  };

  // Verify PIN Code with Backend
  const verifyPincode = async (codeToVerify?: string) => {
    const code = (codeToVerify || pinInput).replace(/\D/g, '');
    if (code.length !== 6) {
      Alert.alert(
        'Invalid PIN Code',
        'Please enter a complete 6-digit Indian PIN code to check service availability.'
      );
      return;
    }

    setCheckingPin(true);
    try {
      const res = await bookingApi.checkServiceability(code);
      setPinResult({
        pincode: code,
        serviceable: res.serviceable,
        city: res.city,
        state: res.state,
        areaName: res.areaName,
        message: res.serviceable
          ? res.message || 'Great! FirstDoor services are available in your area.'
          : res.message || 'Location Not Serviceable: We do not currently operate in this PIN code.',
      });
    } catch {
      setPinResult({
        pincode: code,
        serviceable: false,
        city: null,
        state: null,
        message: 'Location Not Serviceable: Unable to verify service availability in this PIN code.',
      });
    } finally {
      setCheckingPin(false);
    }
  };

  // Apply verified active PIN code
  const handleApplyPincode = async (pincode: string) => {
    if (!pinResult || !pinResult.serviceable) {
      Alert.alert(
        'Location Not Serviceable',
        'Bookings are not allowed outside supported service areas. Please enter an active PIN code.'
      );
      return;
    }

    const matchedPreset = PRESET_LOCALITIES.find((p) => p.pincode === pincode);
    const centroid = getCentroidForPincode(pincode);
    const lat = matchedPreset ? matchedPreset.latitude : centroid.latitude;
    const lng = matchedPreset ? matchedPreset.longitude : centroid.longitude;
    const area = pinResult.areaName || matchedPreset?.name || `PIN ${pincode}`;
    const city = pinResult.city || 'Hyderabad';
    const state = pinResult.state || 'Telangana';

    const locationData: UserLocationData = {
      coordinates: { latitude: lat, longitude: lng },
      address: {
        formattedAddress: `${area}, ${city} - ${pincode}`,
        shortAddress: area,
        area,
        city,
        state,
        pincode,
        addressLine: area,
        fullAddress: `${area}, ${city}, ${state} - ${pincode}`,
      },
      isCustomSelected: true,
    };

    await selectLocation(locationData);
    setCartAddress({
      id: `pin-${pincode}`,
      userId: '',
      title: area,
      addressLine: `${area}, ${city}`,
      city,
      state,
      pincode,
      lat,
      lng,
      isDefault: false,
    });
    router.back();
  };

  // Handle Search input change with 300ms debounce
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (!text.trim() || text.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimeout.current = setTimeout(async () => {
      try {
        const results = await searchLocations(text);
        setSearchResults(results);
      } catch (e) {
        console.warn('[LocationSelect] Search error:', e);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  // Option 1: Use my current location (GPS)
  const handleUseCurrentLocation = async () => {
    setDetectingGps(true);
    try {
      const servicesOn = await isLocationServicesEnabled();
      if (!servicesOn) {
        Alert.alert(
          'GPS Disabled',
          'Please enable device location / GPS in your settings to detect your current location.'
        );
        setDetectingGps(false);
        return;
      }

      const success = await refreshLocation(true);
      if (success) {
        const coords = await getCurrentLocation();
        if (coords) {
          setVerifyingServiceability(true);
          const rev = await reverseGeocodeLocation(coords);

          // Submit resolved pincode to backend serviceability API
          let isServiceable = false;
          let serviceMsg = '';
          if (rev.pincode && /^\d{6}$/.test(rev.pincode)) {
            try {
              const check = await bookingApi.checkServiceability(rev.pincode);
              isServiceable = check.serviceable;
              serviceMsg = check.message;
            } catch (err: any) {
              console.warn('[LocationSelect] Serviceability check error:', err);
            }
          }

          setVerifyingServiceability(false);

          if (!isServiceable) {
            Alert.alert(
              'Location Not Serviceable',
              serviceMsg ||
                `We do not currently operate in ${rev.area || rev.city || 'your area'} (PIN: ${rev.pincode || 'unknown'}). Bookings outside supported areas are not permitted.`,
              [
                {
                  text: 'Enter PIN Code',
                  onPress: () => pinInputRef.current?.focus?.(),
                },
                { text: 'Choose Supported Locality', style: 'cancel' },
              ]
            );
            return;
          }

          // Serviceable — update cart and navigate back
          setCartAddress({
            id: 'current-gps',
            userId: '',
            title: rev.shortAddress || 'Current Location',
            addressLine: rev.addressLine || rev.area || 'Current Location',
            city: rev.city || 'Hyderabad',
            state: rev.state || 'Telangana',
            pincode: rev.pincode,
            lat: coords.latitude,
            lng: coords.longitude,
            isDefault: true,
          });
          router.back();
        }
      } else {
        Alert.alert(
          'Location Permission',
          'Please allow location access in your device settings to detect your current location.'
        );
      }
    } catch (error: any) {
      Alert.alert('Location Error', error?.message || 'Unable to detect GPS position.');
    } finally {
      setDetectingGps(false);
      setVerifyingServiceability(false);
    }
  };

  // Option 2: Select a search result
  const handleSelectLocation = async (item: UserLocationData) => {
    // If pincode is missing, try reverse geocoding to obtain pincode
    let pincode = item.address.pincode;
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      setVerifyingServiceability(true);
      const rev = await reverseGeocodeLocation(item.coordinates);
      setVerifyingServiceability(false);
      if (rev.pincode && /^\d{6}$/.test(rev.pincode)) {
        pincode = rev.pincode;
        item.address.pincode = rev.pincode;
      }
    }

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      Alert.alert(
        'Location Not Serviceable',
        'Selected location does not have a verified 6-digit PIN code. Please enter your PIN code to check coverage.'
      );
      return;
    }

    setVerifyingServiceability(true);
    try {
      const check = await bookingApi.checkServiceability(pincode);
      setVerifyingServiceability(false);
      if (!check.serviceable) {
        Alert.alert(
          'Location Not Serviceable',
          check.message || `FirstDoor is not currently available in PIN code ${pincode}. Bookings outside supported areas are not allowed.`
        );
        return;
      }
    } catch {
      setVerifyingServiceability(false);
      Alert.alert(
        'Location Not Serviceable',
        'Unable to verify service availability in this PIN code. Bookings outside supported areas are not allowed.'
      );
      return;
    }

    await selectLocation(item);
    setCartAddress({
      id: `custom-${item.coordinates.latitude.toFixed(4)}-${item.coordinates.longitude.toFixed(4)}`,
      userId: '',
      title: item.address.shortAddress || 'Selected Area',
      addressLine: item.address.addressLine || item.address.area || item.address.formattedAddress,
      city: item.address.city || 'Hyderabad',
      state: item.address.state || 'Telangana',
      pincode: item.address.pincode || '',
      lat: item.coordinates.latitude,
      lng: item.coordinates.longitude,
      isDefault: false,
    });
    router.back();
  };

  // Option 3: Select a saved address
  const handleSelectSavedAddress = async (addr: Address) => {
    const cleanPin = (addr.pincode || '').replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      Alert.alert(
        'Location Not Serviceable',
        'This saved address is missing a verified 6-digit PIN code. Please update it with an active PIN code to allow booking.'
      );
      return;
    }

    setVerifyingServiceability(true);
    try {
      const check = await bookingApi.checkServiceability(cleanPin);
      setVerifyingServiceability(false);
      if (!check.serviceable) {
        Alert.alert(
          'Location Not Serviceable',
          check.message || 'This saved address is outside our supported service areas. Bookings outside supported areas are not allowed.'
        );
        return;
      }
    } catch {
      setVerifyingServiceability(false);
      Alert.alert(
        'Location Not Serviceable',
        'Unable to verify serviceability for this address. Bookings outside supported areas are not allowed.'
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

    const locationData: UserLocationData = {
      coordinates: {
        latitude: targetLat,
        longitude: targetLng,
      },
      address: {
        formattedAddress: `${addr.addressLine}, ${addr.city}`,
        shortAddress: addr.title || addr.city,
        area: addr.addressLine,
        city: addr.city,
        state: addr.state || 'Telangana',
        pincode: cleanPin,
        addressLine: addr.addressLine,
        fullAddress: `${addr.title ? addr.title + ': ' : ''}${addr.addressLine}, ${addr.city}`,
      },
      isCustomSelected: true,
    };

    await selectLocation(locationData);
    setCartAddress(updatedAddr);
    router.back();
  };

  // Preset locality click
  const handleSelectPreset = async (preset: (typeof PRESET_LOCALITIES)[0]) => {
    setSearching(true);
    try {
      const results = await searchLocations(`${preset.name}, Hyderabad`);
      if (results.length > 0) {
        await handleSelectLocation(results[0]);
      } else {
        handleQueryChange(preset.name);
      }
    } catch {
      handleQueryChange(preset.name);
    } finally {
      setSearching(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: getHeaderTopPadding(insets.top, 10) }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color="#111827" />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Select Delivery Location</Text>
          <Text style={styles.headerSubtitle}>Verified FirstDoor service areas</Text>
        </View>
      </View>

      {/* Search Input Box */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={18} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search locality, street, or pincode..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={handleQueryChange}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => handleQueryChange('')}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear text"
            >
              <X size={16} color="#6B7280" />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={query.trim().length > 0 ? searchResults : []}
        keyExtractor={(item, index) => `loc-${item.address.formattedAddress}-${index}`}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 30 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {/* DEDICATED 6-DIGIT PIN CODE ENTRY CARD */}
            <View style={styles.pinEntryCard}>
              <View style={styles.pinCardHeader}>
                <View style={styles.pinIconCircle}>
                  <Hash size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pinCardTitle}>Enter 6-Digit PIN Code</Text>
                  <Text style={styles.pinCardSub}>Verify doorstep service availability instantly</Text>
                </View>
              </View>

              <View style={styles.pinInputRow}>
                <TextInput
                  ref={pinInputRef}
                  style={styles.pinTextInput}
                  placeholder="e.g. 500072"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={6}
                  value={pinInput}
                  onChangeText={handlePinInputChange}
                  returnKeyType="done"
                  onSubmitEditing={() => verifyPincode()}
                />
                <Pressable
                  style={[
                    styles.pinVerifyBtn,
                    (pinInput.length !== 6 || checkingPin) && styles.pinVerifyBtnDisabled,
                  ]}
                  onPress={() => verifyPincode()}
                  disabled={pinInput.length !== 6 || checkingPin}
                  accessibilityRole="button"
                  accessibilityLabel="Check PIN serviceability"
                >
                  {checkingPin ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.pinVerifyBtnText}>Check</Text>
                  )}
                </Pressable>
              </View>

              {/* Live Serviceability Feedback Banner */}
              {pinResult && (
                <View
                  style={[
                    styles.pinResultBanner,
                    pinResult.serviceable
                      ? styles.pinResultBannerSuccess
                      : styles.pinResultBannerError,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    {pinResult.serviceable ? (
                      <CheckCircle2 size={20} color="#059669" style={{ marginTop: 2 }} />
                    ) : (
                      <AlertTriangle size={20} color="#DC2626" style={{ marginTop: 2 }} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.pinResultTitle,
                          pinResult.serviceable
                            ? styles.pinResultTitleSuccess
                            : styles.pinResultTitleError,
                        ]}
                      >
                        {pinResult.serviceable
                          ? 'Active Service Area'
                          : 'Location Not Serviceable'}
                      </Text>
                      <Text
                        style={[
                          styles.pinResultMsg,
                          pinResult.serviceable
                            ? styles.pinResultMsgSuccess
                            : styles.pinResultMsgError,
                        ]}
                      >
                        {pinResult.message}
                      </Text>

                      {pinResult.serviceable && (
                        <Pressable
                          style={styles.pinApplyBtn}
                          onPress={() => handleApplyPincode(pinResult.pincode)}
                          accessibilityRole="button"
                          accessibilityLabel={`Deliver to PIN ${pinResult.pincode}`}
                        >
                          <Text style={styles.pinApplyBtnText}>
                            Deliver to PIN {pinResult.pincode}
                          </Text>
                          <ArrowRight size={15} color="#FFFFFF" />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* OPTION 1: Use my current location */}
            <Pressable
              style={styles.currentLocationCard}
              onPress={handleUseCurrentLocation}
              disabled={detectingGps || verifyingServiceability}
              accessibilityRole="button"
              accessibilityLabel="Use my current location"
            >
              <View style={styles.currentLocationIconWrap}>
                {detectingGps || verifyingServiceability ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Navigation size={20} color={Colors.primary} />
                )}
              </View>
              <View style={styles.currentLocationTextCol}>
                <Text style={styles.currentLocationTitle}>
                  {detectingGps
                    ? 'Detecting current doorstep...'
                    : verifyingServiceability
                    ? 'Checking serviceability...'
                    : 'Use my current location'}
                </Text>
                <Text style={styles.currentLocationSub}>
                  {detectingGps
                    ? 'Fetching GPS & reverse geocoding'
                    : 'Automatic GPS & service area check'}
                </Text>
              </View>
            </Pressable>

            {/* Currently Active Address Banner */}
            {address?.formattedAddress && !query && (
              <View style={styles.activeLocationBanner}>
                <View style={styles.activeIconCircle}>
                  <Check size={14} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeLabel}>Current Selected</Text>
                  <Text style={styles.activeValue} numberOfLines={1}>
                    {address.formattedAddress}
                  </Text>
                </View>
              </View>
            )}

            {/* OPTION 3: Saved Addresses */}
            {!query && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Saved Addresses</Text>
                  <Pressable
                    onPress={() => router.push('/profile/addresses')}
                    accessibilityRole="button"
                    accessibilityLabel="Manage addresses"
                  >
                    <Text style={styles.sectionAction}>Manage</Text>
                  </Pressable>
                </View>

                {loadingSaved ? (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
                ) : savedAddresses.length > 0 ? (
                  savedAddresses.map((addr) => {
                    const isHome = addr.title?.toLowerCase().includes('home');
                    const isWork = addr.title?.toLowerCase().includes('work');
                    const IconComp = isHome ? Home : isWork ? Briefcase : MapPin;

                    return (
                      <Pressable
                        key={addr.id}
                        style={styles.savedCard}
                        onPress={() => handleSelectSavedAddress(addr)}
                        accessibilityRole="button"
                        accessibilityLabel={`Saved address: ${addr.title}, ${addr.addressLine}`}
                      >
                        <View style={styles.savedIconCircle}>
                          <IconComp size={16} color={Colors.primary} />
                        </View>
                        <View style={styles.savedInfo}>
                          <View style={styles.savedTitleRow}>
                            <Text style={styles.savedTitle}>{addr.title || 'Saved'}</Text>
                            {addr.isDefault && <Text style={styles.defaultBadge}>Default</Text>}
                          </View>
                          <Text style={styles.savedLine} numberOfLines={1}>
                            {addr.addressLine}, {addr.city} {addr.pincode ? `(${addr.pincode})` : ''}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.emptySavedBox}>
                    <Text style={styles.emptySavedText}>No saved addresses yet</Text>
                    <Pressable
                      style={styles.addAddressPill}
                      onPress={() => router.push('/profile/addresses')}
                    >
                      <Plus size={14} color={Colors.primary} />
                      <Text style={styles.addAddressPillText}>Add Address</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* Popular Localities in Hyderabad */}
            {!query && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>Popular Areas in Hyderabad</Text>
                <View style={styles.presetGrid}>
                  {PRESET_LOCALITIES.slice(0, 8).map((preset) => (
                    <Pressable
                      key={preset.name}
                      style={styles.presetChip}
                      onPress={() => handleSelectPreset(preset)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${preset.name}`}
                    >
                      <MapPin size={14} color={Colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.presetText} numberOfLines={1}>
                        {preset.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Search Results Header */}
            {query.trim().length > 0 && (
              <View style={styles.searchResultsHeader}>
                <Text style={styles.sectionTitle}>
                  {searching ? 'Searching...' : `Search Results (${searchResults.length})`}
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.resultItem}
            onPress={() => handleSelectLocation(item)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.address.formattedAddress}`}
          >
            <View style={styles.resultIconWrap}>
              <MapPin size={18} color={Colors.primary} />
            </View>
            <View style={styles.resultTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.resultArea} numberOfLines={1}>
                  {item.address.shortAddress || item.address.area}
                </Text>
                {item.address.pincode ? (
                  <View style={styles.pincodeTag}>
                    <Text style={styles.pincodeTagText}>{item.address.pincode}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.resultAddress} numberOfLines={1}>
                {item.address.fullAddress || item.address.formattedAddress}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          query.trim().length > 0 && !searching ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No matching locations found</Text>
              <Text style={styles.emptySub}>
                Try searching for a locality like "Kukatpally", "Jubilee Hills", "Gachibowli", or a 6-digit PIN.
              </Text>
            </View>
          ) : undefined
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: '#111827',
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: 15,
    color: '#111827',
  },
  clearBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  pinEntryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  pinCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pinIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pinCardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#111827',
  },
  pinCardSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  pinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinTextInput: {
    flex: 1,
    height: 46,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#111827',
    letterSpacing: 2,
  },
  pinVerifyBtn: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinVerifyBtnDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  pinVerifyBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  pinResultBanner: {
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  pinResultBannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pinResultBannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  pinResultTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    marginBottom: 2,
  },
  pinResultTitleSuccess: {
    color: '#065F46',
  },
  pinResultTitleError: {
    color: '#991B1B',
  },
  pinResultMsg: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  pinResultMsgSuccess: {
    color: '#047857',
  },
  pinResultMsgError: {
    color: '#B91C1C',
  },
  pinApplyBtn: {
    marginTop: 10,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  pinApplyBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  currentLocationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  currentLocationTextCol: {
    flex: 1,
  },
  currentLocationTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.primary,
  },
  currentLocationSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  activeLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  activeIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activeLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: '#065F46',
  },
  activeValue: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: '#065F46',
  },
  sectionWrap: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#111827',
  },
  sectionAction: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  savedIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savedInfo: {
    flex: 1,
  },
  savedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  savedTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#111827',
    marginRight: 8,
  },
  defaultBadge: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.primary,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  savedLine: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
  },
  emptySavedBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptySavedText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  addAddressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
  },
  addAddressPillText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: '#374151',
  },
  searchResultsHeader: {
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultTextCol: {
    flex: 1,
  },
  resultArea: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#111827',
  },
  pincodeTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pincodeTagText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.primary,
  },
  resultAddress: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#374151',
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
