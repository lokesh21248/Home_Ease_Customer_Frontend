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
import { addressApi } from '../../api/addressApi';
import { Address } from '../../types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { AddressCard } from '../../components/booking/AddressCard';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type MyAddressesNavProp = StackNavigationProp<RootStackParamList, 'MyAddresses'>;

interface Props {
  navigation: MyAddressesNavProp;
}

export const MyAddressesScreen: React.FC<Props> = ({ navigation }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form fields
  const [type, setType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [houseFlat, setHouseFlat] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');

  const loadAddresses = async () => {
    const data = await addressApi.getAddresses();
    setAddresses(data);
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleEdit = (addr: Address) => {
    setEditingId(addr.id);
    setType(addr.type);
    setHouseFlat(addr.houseFlat);
    setStreet(addr.street);
    setArea(addr.area);
    setCity(addr.city);
    setPincode(addr.pincode);
    setLandmark(addr.landmark || '');
    setShowModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    await addressApi.deleteAddress(deleteId);
    setDeleteId(null);
    await loadAddresses();
  };

  const handleSave = async () => {
    if (!houseFlat.trim() || !street.trim() || !area.trim() || !pincode.trim()) {
      Alert.alert('Required Fields', 'Please fill in house number, street, area, and pincode.');
      return;
    }

    const addressLine = [houseFlat.trim(), street.trim(), area.trim()].filter(Boolean).join(', ');

    if (editingId) {
      await addressApi.updateAddress(editingId, {
        title: type,
        addressLine,
        type,
        label: type,
        houseFlat,
        street,
        area,
        city,
        pincode,
        landmark,
      });
    } else {
      await addressApi.addAddress({
        title: type,
        addressLine,
        type,
        label: type,
        houseFlat,
        street,
        area,
        city,
        state: 'Telangana',
        pincode,
        landmark,
        isDefault: addresses.length === 0,
      });
    }

    setShowModal(false);
    setEditingId(null);
    setHouseFlat('');
    setStreet('');
    setArea('');
    setPincode('');
    setLandmark('');
    await loadAddresses();
  };

  return (
    <ScreenWrapper>
      <Header title="My Addresses" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {addresses.map((addr) => (
          <AddressCard
            key={addr.id}
            address={addr}
            showActions
            onSelect={() => addressApi.setDefaultAddress(addr.id).then(loadAddresses)}
            onEdit={() => handleEdit(addr)}
            onDelete={() => setDeleteId(addr.id)}
          />
        ))}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setEditingId(null);
            setType('Home');
            setHouseFlat('');
            setStreet('');
            setArea('');
            setPincode('');
            setLandmark('');
            setShowModal(true);
          }}
          style={[styles.addBtn, SHADOWS.subtle]}
        >
          <Ionicons name="add-circle-outline" size={22} color={COLORS.primaryDark} />
          <Text style={styles.addBtnText}>+ Add New Address</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={!!deleteId}
        title="Delete Address?"
        message="Are you sure you want to remove this saved address?"
        confirmTitle="Delete"
        cancelTitle="Cancel"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

      {/* Add / Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.primaryDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.typeSelectorRow}>
                {(['Home', 'Work', 'Other'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
                    style={[styles.typePill, type === t && styles.typePillSelected]}
                  >
                    <Text style={[styles.typePillText, type === t && styles.typePillTextSelected]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input placeholder="House / Flat No." value={houseFlat} onChangeText={setHouseFlat} />
              <Input placeholder="Street / Road" value={street} onChangeText={setStreet} />
              <Input placeholder="Area / Locality" value={area} onChangeText={setArea} />
              <Input placeholder="City" value={city} onChangeText={setCity} />
              <Input
                placeholder="Pincode (6 digits)"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Input placeholder="Landmark (Optional)" value={landmark} onChangeText={setLandmark} />

              <Button
                title={editingId ? 'Update Address' : 'Save Address'}
                onPress={handleSave}
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
    paddingBottom: 40,
  },
  addBtn: {
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
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginLeft: 8,
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
