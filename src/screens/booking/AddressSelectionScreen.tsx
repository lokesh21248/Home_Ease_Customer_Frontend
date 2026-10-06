import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useBooking } from '../../context/BookingContext';
import { addressApi } from '../../api/addressApi';
import { Address } from '../../types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { AddressCard } from '../../components/booking/AddressCard';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type AddressSelectionNavProp = StackNavigationProp<RootStackParamList, 'AddressSelection'>;

interface Props {
  navigation: AddressSelectionNavProp;
}

export const AddressSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const { selectedAddress, setAddress } = useBooking();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [houseFlat, setHouseFlat] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [state] = useState('Telangana');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAddresses = async () => {
    const list = await addressApi.getAddresses();
    setAddresses(list);
    if (!selectedAddress && list.length > 0) {
      setAddress(list[0]);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleSelect = (addr: Address) => {
    setAddress(addr);
    navigation.navigate('DateTimeSlot');
  };

  const handleSaveAddress = async () => {
    if (!houseFlat.trim() || !street.trim() || !area.trim() || !pincode.trim()) {
      Alert.alert('Required Fields', 'Please fill in house number, street, area, and pincode.');
      return;
    }
    if (pincode.trim().length !== 6 || !/^\d{6}$/.test(pincode.trim())) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit postal pincode.');
      return;
    }

    setLoading(true);
    try {
      const addressLine = [houseFlat.trim(), street.trim(), area.trim()].filter(Boolean).join(', ');
      const created = await addressApi.addAddress({
        title: addressType,
        addressLine,
        type: addressType,
        label: addressType,
        houseFlat: houseFlat.trim(),
        street: street.trim(),
        area: area.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim() || undefined,
        isDefault: addresses.length === 0,
      });

      await loadAddresses();
      setAddress(created);
      setShowAddModal(false);
      // Reset
      setHouseFlat('');
      setStreet('');
      setArea('');
      setPincode('');
      setLandmark('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Select Address" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Map Preview Snippet from Image 1 Screen 9 */}
        <View style={[styles.mapCard, SHADOWS.card]}>
          <View style={styles.mapGraphic}>
            <View style={styles.mapGridPattern} />
            <View style={styles.mapPinPulse}>
              <View style={styles.pinCircle}>
                <Ionicons name="location" size={20} color="#FFFFFF" />
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert('Current Location Detected', 'Kukatpally, Hyderabad (Accurate to 15m)');
            }}
            style={styles.currentLocationBtn}
          >
            <Ionicons name="navigate-circle-outline" size={22} color={COLORS.primaryDark} />
            <Text style={styles.currentLocationText}>Use current location</Text>
          </TouchableOpacity>
        </View>

        {/* Saved Addresses Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Saved Addresses</Text>
        </View>

        {addresses.map((addr) => (
          <AddressCard
            key={addr.id}
            address={addr}
            isSelected={selectedAddress?.id === addr.id}
            onSelect={() => handleSelect(addr)}
          />
        ))}

        {/* Add New Address Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowAddModal(true)}
          style={[styles.addAddressBtn, SHADOWS.subtle]}
        >
          <Ionicons name="add-circle-outline" size={22} color={COLORS.primaryDark} />
          <Text style={styles.addAddressText}>+ Add New Address</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Continue Sticky CTA */}
      {selectedAddress && (
        <View style={[styles.bottomBar, SHADOWS.card]}>
          <Button
            title="Continue to Date & Time"
            onPress={() => navigation.navigate('DateTimeSlot')}
            variant="primary"
            size="lg"
            style={{ width: '100%' }}
          />
        </View>
      )}

      {/* Add Address Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Address</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.primaryDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Type Selector */}
              <View style={styles.typeSelectorRow}>
                {(['Home', 'Work', 'Other'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setAddressType(t)}
                    style={[
                      styles.typePill,
                      addressType === t && styles.typePillSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        addressType === t && styles.typePillTextSelected,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                placeholder="House / Flat / Block No."
                value={houseFlat}
                onChangeText={setHouseFlat}
              />
              <Input
                placeholder="Street / Road / Society"
                value={street}
                onChangeText={setStreet}
              />
              <Input placeholder="Area / Locality" value={area} onChangeText={setArea} />
              <Input placeholder="City" value={city} onChangeText={setCity} />
              <Input
                placeholder="Pincode (6 digits)"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Input
                placeholder="Landmark (Optional)"
                value={landmark}
                onChangeText={setLandmark}
              />

              <Button
                title="Save & Proceed"
                onPress={handleSaveAddress}
                loading={loading}
                variant="primary"
                size="lg"
                style={{ marginTop: 12, marginBottom: 20 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xs,
    paddingBottom: 110,
  },
  mapCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: SPACING.lg,
  },
  mapGraphic: {
    height: 120,
    backgroundColor: '#D7EBE1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mapGridPattern: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#CEE5DA',
    opacity: 0.6,
  },
  mapPinPulse: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(24, 64, 53, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(50, 100, 80, 0.1)',
  },
  currentLocationText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginLeft: 8,
  },
  sectionHeader: {
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(50, 100, 80, 0.2)',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addAddressText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginLeft: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.95)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 35, 28, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: SPACING.xl,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(235, 245, 240, 0.8)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(50, 100, 80, 0.15)',
  },
  typePillSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentHover,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  typePillTextSelected: {
    fontWeight: '700',
  },
});
