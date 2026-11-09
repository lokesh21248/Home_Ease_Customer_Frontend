/**
 * Booking Summary Screen — review order, friend booking, apply coupon, select payment, and place booking.
 * Enforces transaction-time serviceability assertion against Spring Boot PostgreSQL schema,
 * strict coordinate & 6-digit pincode validation, and independent recipient address handling for friend bookings.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bookingApi, userApi, BookingRequest, generateUUID } from '../../src/api/client';
import { useCart, PaymentMethod } from '../../src/context/CartContext';
import { useUserLocation } from '../../src/hooks/useUserLocation';
import { useWallet } from '../../src/hooks/useWallet';
import { sendBookingAddressToBackend } from '../../src/services/locationService';
import { isValidCoordinate } from '../../src/services/coordinates';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { Users, AlertTriangle } from 'lucide-react-native';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'WALLET', label: 'FirstDoor Wallet', icon: '💳' },
  { id: 'UPI', label: 'UPI / GPay / PhonePe', icon: '📱' },
  { id: 'CARD', label: 'Credit / Debit Card', icon: '💳' },
  { id: 'NET_BANKING', label: 'Net Banking', icon: '🏦' },
  { id: 'COD', label: 'Cash on Delivery', icon: '💵' },
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORY_DEFAULT_SUB_SERVICE: Record<string, string> = {
  'be8bb640-cc11-4243-ab4a-5cbdf34a0937': '2f689366-014d-4992-9cdd-68e5cd0a81bd', // Cleaning
  '9b7f941c-ee83-4ffe-bd1d-2dacba5d4760': '81c19bec-3f12-4eca-a5bb-888271dd614c', // AC
  '6beaaf16-cb8b-4107-9f8b-617b23c0bd21': 'c34b4032-95ed-4ed5-b5e9-a7f5ab8cd4f7', // Massage
  '6e2e370b-7d5e-46d2-944b-afe7c15db6d5': '3c391970-28ee-4f28-a566-5c3b48763525', // Electrician
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BillRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, highlight && styles.billLabelHighlight]}>{label}</Text>
      <Text style={[styles.billValue, highlight && styles.billValueHighlight]}>{value}</Text>
    </View>
  );
}

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const { cart, setCoupon, setPaymentMethod, setAddress, clearCart } = useCart();
  const userLoc = useUserLocation();
  const { balance, deductMoney } = useWallet();

  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(generateUUID());

  const [couponCode, setCouponCode] = useState(cart.coupon?.code || '');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Friend / third-party booking state
  const [isForFriend, setIsForFriend] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientPincode, setRecipientPincode] = useState('');

  // Live address serviceability state for the summary view
  const [addressServiceability, setAddressServiceability] = useState<{
    checking: boolean;
    serviceable: boolean;
    pincode: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function verifyCurrentAddressService() {
      const rawPin = isForFriend
        ? recipientPincode
        : cart.selectedAddress?.pincode || userLoc.address?.pincode || '';
      const pin = rawPin.replace(/\D/g, '');

      if (pin.length !== 6) {
        if (isMounted) {
          setAddressServiceability({
            checking: false,
            serviceable: false,
            pincode: pin,
            message: 'Location Not Serviceable: A 6-digit PIN code is required to check serviceability.',
          });
        }
        return;
      }

      if (isMounted) {
        setAddressServiceability({
          checking: true,
          serviceable: false,
          pincode: pin,
          message: 'Checking service availability...',
        });
      }

      try {
        const res = await bookingApi.checkServiceability(pin);
        if (isMounted) {
          setAddressServiceability({
            checking: false,
            serviceable: res.serviceable,
            pincode: pin,
            message: res.serviceable
              ? res.message || 'Great! FirstDoor services are available in your area.'
              : res.message || 'Location Not Serviceable: FirstDoor is not available in this PIN code.',
          });
        }
      } catch {
        if (isMounted) {
          setAddressServiceability({
            checking: false,
            serviceable: false,
            pincode: pin,
            message: 'Location Not Serviceable: Unable to verify PIN code serviceability.',
          });
        }
      }
    }

    verifyCurrentAddressService();

    return () => {
      isMounted = false;
    };
  }, [cart.selectedAddress, userLoc.address, isForFriend, recipientPincode]);

  // Auto-fetch and select user's active selected address or saved address if not already selected
  useEffect(() => {
    if (!cart.selectedAddress) {
      // 1. If user has an active selected address in LocationContext, prioritize it as the active booking address
      if (userLoc.address && userLoc.location && userLoc.address.pincode && /^\d{6}$/.test(userLoc.address.pincode)) {
        setAddress({
          id: (userLoc.address as any).id || `loc-${userLoc.address.pincode}`,
          userId: '',
          title: userLoc.address.shortAddress || userLoc.address.area || 'Selected Address',
          addressLine: userLoc.address.addressLine || userLoc.address.area || 'Selected Address',
          city: userLoc.address.city || 'Hyderabad',
          state: userLoc.address.state || 'Telangana',
          pincode: userLoc.address.pincode,
          lat: userLoc.location.latitude,
          lng: userLoc.location.longitude,
          isDefault: false,
        });
        return;
      }

      // 2. Otherwise load saved addresses from user profile
      userApi
        .getAddresses()
        .then((addresses) => {
          if (addresses && addresses.length > 0) {
            const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
            setAddress(defaultAddr);
          } else if (userLoc.address && userLoc.location) {
            setAddress({
              id: 'current-location',
              userId: '',
              title: userLoc.address.shortAddress || 'Current Location',
              addressLine: userLoc.address.addressLine || userLoc.address.area || 'Current Location',
              city: userLoc.address.city || 'Hyderabad',
              state: userLoc.address.state || 'Telangana',
              pincode: userLoc.address.pincode,
              lat: userLoc.location.latitude,
              lng: userLoc.location.longitude,
              isDefault: true,
            });
          }
        })
        .catch(() => {
          if (userLoc.address && userLoc.location) {
            setAddress({
              id: 'current-location',
              userId: '',
              title: userLoc.address.shortAddress || 'Current Location',
              addressLine: userLoc.address.addressLine || userLoc.address.area || 'Current Location',
              city: userLoc.address.city || 'Hyderabad',
              state: userLoc.address.state || 'Telangana',
              pincode: userLoc.address.pincode,
              lat: userLoc.location.latitude,
              lng: userLoc.location.longitude,
              isDefault: true,
            });
          }
        });
    }
  }, [cart.selectedAddress, setAddress, userLoc.address, userLoc.location]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const result = await bookingApi.validateCoupon(couponCode.trim().toUpperCase(), cart.subtotal);
      if (result.valid) {
        setCoupon(result);
      } else {
        setCouponError(result.message || 'Invalid coupon');
      }
    } catch (e: any) {
      setCouponError(e?.message || 'Failed to validate coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handlePlaceBooking = async () => {
    if (bookingLoading || isSubmittingRef.current) return;

    if (cart.items.length === 0) {
      Alert.alert('No Services', 'Please select at least one service to book.');
      return;
    }

    if (!cart.category?.serviceId) {
      Alert.alert('Error', 'Service category is missing.');
      return;
    }

    let targetPincode = '';
    let targetAddressLine = '';
    let targetCity = 'Hyderabad';
    let userLat = 17.4485;
    let userLng = 78.3748;

    if (isForFriend) {
      // 1. Validate friend fields
      if (!recipientName.trim()) {
        Alert.alert('Recipient Name Required', 'Please enter the name of the person receiving the service.');
        return;
      }

      const cleanedPhone = recipientPhone.trim().replace(/[\s-]/g, '');
      const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
      if (!phoneRegex.test(cleanedPhone)) {
        Alert.alert(
          'Invalid Mobile Number',
          'Please enter a valid 10-digit Indian mobile number for the recipient.'
        );
        return;
      }

      if (!recipientAddress.trim() || recipientAddress.trim().length < 5) {
        Alert.alert(
          'Recipient Address Required',
          'Please enter the complete doorstep address (flat, building, street, area) for the recipient.'
        );
        return;
      }

      const cleanedPin = recipientPincode.trim().replace(/\D/g, '');
      if (cleanedPin.length !== 6) {
        Alert.alert(
          'Location Not Serviceable',
          'Please enter a valid 6-digit PIN code for the recipient address.'
        );
        return;
      }

      targetPincode = cleanedPin;
      targetAddressLine = recipientAddress.trim();
    } else {
      // Self booking: address is required
      let address = cart.selectedAddress;
      if (!address) {
        if (userLoc.address && userLoc.location && userLoc.address.pincode && /^\d{6}$/.test(userLoc.address.pincode)) {
          address = {
            id: (userLoc.address as any).id || `loc-${userLoc.address.pincode}`,
            userId: '',
            title: userLoc.address.shortAddress || userLoc.address.area || 'Selected Address',
            addressLine: userLoc.address.addressLine || userLoc.address.area || 'Selected Address',
            city: userLoc.address.city || 'Hyderabad',
            state: userLoc.address.state || 'Telangana',
            pincode: userLoc.address.pincode,
            lat: userLoc.location.latitude,
            lng: userLoc.location.longitude,
            isDefault: false,
          };
          setAddress(address);
        } else {
          try {
            const addresses = await userApi.getAddresses();
            if (addresses && addresses.length > 0) {
              address = addresses.find((a) => a.isDefault) || addresses[0];
              setAddress(address);
            }
          } catch {}
        }
      }

      if (!address) {
        Alert.alert('Address Required', 'Please select or add a delivery address to continue.');
        return;
      }

      // Check coordinates validity
      if (isValidCoordinate(address.lat, address.lng)) {
        userLat = address.lat;
        userLng = address.lng;
      }

      targetAddressLine = address.addressLine || 'Service Location';
      targetCity = address.city || 'Hyderabad';

      // Resolve 6-digit pincode strictly from selected address as source of truth
      let rawPin = address.pincode || (userLoc.address?.pincode && /^\d{6}$/.test(userLoc.address.pincode) ? userLoc.address.pincode : '');
      if (!rawPin) {
        const match = `${address.city || ''} ${address.addressLine || ''}`.match(/\b\d{6}\b/);
        if (match) rawPin = match[0];
      }
      const cleanedPin = rawPin.replace(/\D/g, '');
      if (cleanedPin.length !== 6) {
        Alert.alert(
          'Location Not Serviceable',
          'Your selected delivery address does not have a verified 6-digit PIN code. Please select a valid address.'
        );
        return;
      }
      targetPincode = cleanedPin;

      // Coordinate sanity check: if 500010 (Alwal/Bolarum) has stale KPHB coordinates (17.4947), correct to Alwal centroid
      if (cleanedPin === '500010' && (Math.abs(userLat - 17.4947) < 0.005 || !isValidCoordinate(userLat, userLng))) {
        userLat = 17.5028;
        userLng = 78.5078;
      }
    }

    // 2. Pre-flight backend serviceability check (Authoritative check against PostgreSQL)
    isSubmittingRef.current = true;
    setBookingLoading(true);
    try {
      const serviceCheck = await bookingApi.checkServiceability(targetPincode);
      if (!serviceCheck.serviceable) {
        setBookingLoading(false);
        isSubmittingRef.current = false;
        Alert.alert(
          'Location Not Serviceable',
          serviceCheck.message ||
            `FirstDoor is not currently active in PIN code ${targetPincode}. Bookings outside supported areas are not permitted.`
        );
        return;
      }
    } catch (checkErr: any) {
      console.warn('[BookingSummary] Serviceability pre-check error:', checkErr);
      setBookingLoading(false);
      isSubmittingRef.current = false;
      Alert.alert(
        'Location Not Serviceable',
        `Unable to verify service availability for PIN code ${targetPincode}. Bookings outside supported areas are not permitted.`
      );
      return;
    }

    const scheduledDate = cart.selectedDate || new Date().toISOString().split('T')[0];
    let scheduledAt = new Date().toISOString();
    if (cart.bookingType === 'SCHEDULED') {
      scheduledAt = `${scheduledDate}T09:00:00+05:30`;
      if (cart.selectedSlot?.time) {
        const startPart = cart.selectedSlot.time.split('-')[0].trim();
        const match = startPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (match) {
          let hrs = parseInt(match[1], 10);
          const mins = match[2];
          const mod = match[3]?.toUpperCase();
          if (mod === 'PM' && hrs < 12) hrs += 12;
          if (mod === 'AM' && hrs === 12) hrs = 0;
          scheduledAt = `${scheduledDate}T${String(hrs).padStart(2, '0')}:${mins}:00+05:30`;
        }
      }
    }

    let serviceId = cart.category?.serviceId || '';
    if (!UUID_REGEX.test(serviceId)) {
      const fallbackMap: Record<string, string> = {
        electrician: '6e2e370b-7d5e-46d2-944b-afe7c15db6d5',
        cleaning: 'be8bb640-cc11-4243-ab4a-5cbdf34a0937',
        massage: '6beaaf16-cb8b-4107-9f8b-617b23c0bd21',
        ac: '9b7f941c-ee83-4ffe-bd1d-2dacba5d4760',
      };
      serviceId = fallbackMap[serviceId.toLowerCase()] || '6e2e370b-7d5e-46d2-944b-afe7c15db6d5';
    }

    let subServices = cart.items.map((i) => {
      let subId = i.subService.subServiceId;
      if (!UUID_REGEX.test(subId)) {
        subId = CATEGORY_DEFAULT_SUB_SERVICE[serviceId] || '3c391970-28ee-4f28-a566-5c3b48763525';
      }
      return {
        subServiceId: subId,
        quantity: Math.max(1, Number(i.quantity) || 1),
      };
    });

    if (subServices.length === 0) {
      const defaultSub = CATEGORY_DEFAULT_SUB_SERVICE[serviceId] || '3c391970-28ee-4f28-a566-5c3b48763525';
      subServices = [{ subServiceId: defaultSub, quantity: 1 }];
    }

    const addons = cart.items.flatMap((i) =>
      i.selectedAddons
        .filter((a) => UUID_REGEX.test(a.addon.addonId))
        .map((a) => ({
          addonId: a.addon.addonId,
          quantity: Math.max(1, Number(a.quantity) || 1),
        }))
    );

    const numericLat = Number(userLat) || 17.4485;
    const numericLng = Number(userLng) || 78.3748;

    const payload: BookingRequest = {
      serviceId,
      subServices,
      addons: addons.length > 0 ? addons : undefined,
      ...(cart.coupon && { couponCode: cart.coupon.code }),
      scheduledAt,
      userLat: numericLat,
      userLng: numericLng,
      userLocation: isForFriend
        ? `${targetAddressLine}, ${targetCity} (${targetPincode})`
        : `${targetAddressLine}, ${targetCity}`,
      paymentMethod: cart.paymentMethod || 'COD',
      pincode: targetPincode,
      addressId: !isForFriend && cart.selectedAddress?.id ? cart.selectedAddress.id : undefined,
      isForFriend: Boolean(isForFriend),
      idempotencyKey: idempotencyKeyRef.current,
      ...(isForFriend && {
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim().replace(/[\s-]/g, ''),
        recipientAddress: `${targetAddressLine}, ${targetCity} (${targetPincode})`,
      }),
    };

    if (cart.paymentMethod === 'WALLET') {
      if (balance < cart.total) {
        setBookingLoading(false);
        isSubmittingRef.current = false;
        Alert.alert(
          'Insufficient Wallet Balance',
          `Your wallet balance is ₹${balance.toLocaleString('en-IN')}, but total is ₹${cart.total.toLocaleString('en-IN')}. Please top up your wallet or select another payment method.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Top Up Wallet', onPress: () => router.push('/profile/wallet') },
          ]
        );
        return;
      }
    }

    try {
      // Send confirmed booking address to backend
      if (!isForFriend && cart.selectedAddress) {
        sendBookingAddressToBackend({
          label: cart.selectedAddress.title || 'Delivery Address',
          addressLine: targetAddressLine,
          city: targetCity,
          pincode: targetPincode,
          latitude: userLat,
          longitude: userLng,
        }).catch((err) => {
          console.warn('[BookingSummary] Backend address storage warning:', err);
        });
      }

      let booking: any;
      if (cart.bookingType === 'INSTANT') {
        booking = await bookingApi.createInstantBooking({
          ...payload,
          bookingType: 'INSTANT',
        });
      } else {
        const slotText = cart.selectedSlot?.time || '09:00 AM - 10:00 AM';
        booking = await bookingApi.createScheduledBooking({
          ...payload,
          bookingType: 'SCHEDULED',
          scheduledDate,
          timeSlot: slotText,
          holdId: cart.activeHold?.holdId,
          lockToken: cart.activeHold?.lockToken,
        });
      }

      // Deduct from wallet if paid via WALLET
      if (cart.paymentMethod === 'WALLET') {
        try {
          await deductMoney(cart.total, `Booking #${booking.bookingId.slice(-6).toUpperCase()}`);
        } catch (walletErr) {
          console.warn('[BookingSummary] Wallet deduction warning:', walletErr);
        }
      }

      // Ensure bookingId exists before clearing cart and moving to success screen
      if (booking?.bookingId) {
        clearCart();
        router.replace({
          pathname: '/booking/success',
          params: {
            bookingId: booking.bookingId,
            scheduledAt: booking.scheduledAt,
            serviceName: booking.serviceName || cart.category.name,
          },
        });
      } else {
        throw new Error('Booking could not be confirmed. Please check your bookings.');
      }
    } catch (e: any) {
      console.error('[BookingSummary] Booking submission error:', e);
      const isTimeout =
        e?.status === 408 ||
        (typeof e?.message === 'string' &&
          (e.message.toLowerCase().includes('longer than expected') ||
            e.message.toLowerCase().includes('timeout') ||
            e.message.toLowerCase().includes('aborted') ||
            e.message.toLowerCase().includes('canceled')));

      if (isTimeout) {
        Alert.alert(
          'Booking Processing',
          'Your booking request was submitted to the network and may still be dispatching a worker. Please check "My Bookings" before placing another request to avoid duplicates.',
          [
            {
              text: 'View My Bookings',
              onPress: () => router.push('/bookings' as any),
            },
            {
              text: 'Stay Here',
              style: 'cancel',
            },
          ]
        );
      } else {
        // Regenerate idempotency key on failure so next attempt has a fresh key
        idempotencyKeyRef.current = generateUUID();
        Alert.alert('Booking Failed', e?.message || 'Something went wrong while placing your booking.');
      }
    } finally {
      isSubmittingRef.current = false;
      setBookingLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* Header with Safe Status Area */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Booking Summary</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 110 + Math.max(insets.bottom, 12) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Services */}
        <SectionCard title="📦 Selected Services">
          {cart.items.map((item) => (
            <View key={item.subService.subServiceId} style={styles.serviceRow}>
              <View style={styles.serviceRowLeft}>
                <Text style={styles.serviceRowName}>{item.subService.name}</Text>
                {item.selectedAddons.length > 0 && (
                  <Text style={styles.serviceRowAddons}>
                    +{item.selectedAddons.map((a) => a.addon.name).join(', ')}
                  </Text>
                )}
              </View>
              <Text style={styles.serviceRowPrice}>
                ₹{(
                  item.subService.basePrice * item.quantity +
                  item.selectedAddons.reduce((s, a) => s + a.addon.price * a.quantity, 0)
                ).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </SectionCard>

        {/* Appointment Mode */}
        <SectionCard title={cart.bookingType === 'INSTANT' ? "⚡ Instant Booking" : "📅 Scheduled Appointment"}>
          {cart.bookingType === 'INSTANT' ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dispatch Type</Text>
                <Text style={[styles.infoValue, { color: '#059669', fontWeight: '700' }]}>⚡ Immediate Dispatch</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estimated Arrival</Text>
                <Text style={[styles.infoValue, { color: '#059669', fontWeight: '800' }]}>~{cart.estimatedArrivalMinutes || 18} Minutes</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Scheduled Date</Text>
                <Text style={styles.infoValue}>{cart.selectedDate || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time Window</Text>
                <Text style={styles.infoValue}>{cart.selectedSlot?.time || '—'}</Text>
              </View>
            </>
          )}
        </SectionCard>

        {/* Friend / Third-Party Booking Card */}
        <View style={styles.friendCard}>
          <View style={styles.friendHeader}>
            <View style={styles.friendTitleRow}>
              <Users size={18} color={Colors.primary} />
              <Text style={styles.friendTitle}>Booking for someone else?</Text>
            </View>
            <Switch
              value={isForFriend}
              onValueChange={setIsForFriend}
              trackColor={{ false: '#E5E7EB', true: Colors.primaryFade }}
              thumbColor={isForFriend ? Colors.primary : '#9CA3AF'}
            />
          </View>
          <Text style={styles.friendSub}>
            Send service professionals directly to a friend or family member's address in Hyderabad.
          </Text>

          {isForFriend && (
            <View style={styles.friendForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recipient Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor={Colors.textMuted}
                  value={recipientName}
                  onChangeText={setRecipientName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recipient Mobile Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recipient Doorstep Address *</Text>
                <TextInput
                  style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Flat/House no., Building, Street, Locality"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  value={recipientAddress}
                  onChangeText={setRecipientAddress}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recipient Delivery Pincode (6 digits) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 500072"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={recipientPincode}
                  onChangeText={setRecipientPincode}
                />
                {isForFriend && addressServiceability && recipientPincode.replace(/\D/g, '').length === 6 && (
                  addressServiceability.checking ? (
                    <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4 }}>
                      Checking service availability...
                    </Text>
                  ) : addressServiceability.serviceable ? (
                    <Text style={{ fontSize: 11, color: '#059669', fontFamily: Typography.fontFamily.semiBold, marginTop: 4 }}>
                      ✓ Serviceable Area — Doorstep available in PIN {addressServiceability.pincode}
                    </Text>
                  ) : (
                    <View style={styles.unserviceableWarningBox}>
                      <AlertTriangle size={14} color="#DC2626" />
                      <Text style={styles.unserviceableWarningText}>
                        Location Not Serviceable: {addressServiceability.message}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>
          )}
        </View>

        {/* Address (Self Booking) */}
        {!isForFriend && (
          <SectionCard title="📍 Service Location">
            {cart.selectedAddress ? (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text style={styles.addressTitle}>{cart.selectedAddress.title || 'Home'}</Text>
                      {cart.selectedAddress.lat ? (
                        <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontFamily: Typography.fontFamily.medium, fontSize: 10, color: Colors.primary }}>
                            GPS Verified
                          </Text>
                        </View>
                      ) : null}
                      {cart.selectedAddress.pincode ? (
                        <View style={{ backgroundColor: addressServiceability?.serviceable ? '#ECFDF5' : '#FEF2F2', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontFamily: Typography.fontFamily.bold, fontSize: 10, color: addressServiceability?.serviceable ? '#059669' : '#DC2626' }}>
                            PIN: {cart.selectedAddress.pincode}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.addressLine}>{cart.selectedAddress.addressLine}</Text>
                    <Text style={styles.addressCity}>{cart.selectedAddress.city}</Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/location/select')}
                    accessibilityRole="button"
                    accessibilityLabel="Change address"
                    style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#EFF6FF', borderRadius: 8 }}
                  >
                    <Text style={{ color: Colors.primary, fontFamily: Typography.fontFamily.bold, fontSize: 13 }}>
                      Change
                    </Text>
                  </Pressable>
                </View>

                {/* Serviceability Banner for Self Address */}
                {addressServiceability && !addressServiceability.serviceable && !addressServiceability.checking && (
                  <View style={styles.unserviceableWarningBox}>
                    <AlertTriangle size={15} color="#DC2626" />
                    <Text style={styles.unserviceableWarningText}>
                      Location Not Serviceable: {addressServiceability.message || 'Bookings outside supported areas are not permitted.'}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Pressable
                style={styles.addAddressBtn}
                onPress={() => router.push('/location/select')}
              >
                <Text style={styles.addAddressText}>+ Select or Add Delivery Address</Text>
              </Pressable>
            )}
          </SectionCard>
        )}

        {/* Coupon */}
        <SectionCard title="🏷️ Promo Code">
          {cart.coupon ? (
            <View style={styles.couponApplied}>
              <View style={styles.couponAppliedLeft}>
                <Text style={styles.couponAppliedIcon}>🎉</Text>
                <View>
                  <Text style={styles.couponAppliedCode}>{cart.coupon.code}</Text>
                  <Text style={styles.couponAppliedSaving}>
                    You save ₹{cart.coupon.discountAmount}
                  </Text>
                </View>
              </View>
              <Pressable onPress={handleRemoveCoupon}>
                <Text style={styles.removeCouponText}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.couponRow}>
              <TextInput
                style={styles.couponInput}
                value={couponCode}
                onChangeText={(t) => { setCouponCode(t.toUpperCase()); setCouponError(''); }}
                placeholder="Enter promo code"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={handleApplyCoupon}
              />
              <TouchableOpacity
                style={styles.couponBtn}
                onPress={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
              >
                {couponLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.couponBtnGradient}>
                    <Text style={styles.couponBtnText}>Apply</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          )}
          {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}
        </SectionCard>

        {/* Payment Method */}
        <SectionCard title="💳 Payment Method">
          {PAYMENT_METHODS.map((method) => {
            const isWallet = method.id === 'WALLET';
            const isSelected = cart.paymentMethod === method.id;
            return (
              <Pressable
                key={method.id}
                style={[
                  styles.paymentOption,
                  isSelected && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.paymentLabel, isSelected && styles.paymentLabelSelected]}>
                    {method.label}
                  </Text>
                  {isWallet && (
                    <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
                      <Text style={{ fontFamily: Typography.fontFamily.semiBold, fontSize: 10, color: '#059669' }}>
                        ₹{balance.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </SectionCard>

        {/* Bill breakdown */}
        <SectionCard title="🧾 Bill Summary">
          <BillRow label="Subtotal" value={`₹${cart.subtotal.toLocaleString('en-IN')}`} />
          {cart.discount > 0 && (
            <BillRow label="Discount" value={`-₹${cart.discount.toLocaleString('en-IN')}`} />
          )}
          <View style={styles.divider} />
          <BillRow label="Total Amount" value={`₹${cart.total.toLocaleString('en-IN')}`} highlight />
        </SectionCard>
      </ScrollView>

      {/* Place booking CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total Payable</Text>
          <Text style={styles.footerTotalValue}>₹{cart.total.toLocaleString('en-IN')}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.placeBtn,
            addressServiceability && !addressServiceability.serviceable && styles.placeBtnDisabled,
          ]}
          onPress={handlePlaceBooking}
          disabled={bookingLoading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              addressServiceability && !addressServiceability.serviceable
                ? ['#9CA3AF', '#6B7280']
                : [Colors.primary, Colors.primaryDark]
            }
            style={styles.placeBtnGradient}
          >
            {bookingLoading ? (
              <View style={styles.loadingBtnRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.placeBtnText, { marginLeft: 8 }]}>Confirming Booking...</Text>
              </View>
            ) : (
              <Text style={styles.placeBtnText}>
                {addressServiceability && !addressServiceability.serviceable
                  ? 'Location Not Serviceable'
                  : 'Place Booking'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  unserviceableWarningBox: {
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unserviceableWarningText: {
    flex: 1,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
  placeBtnDisabled: {
    opacity: 0.85,
  },
  container: { flex: 1, backgroundColor: Colors.background },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: Colors.textPrimary, fontSize: 20 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  scroll: { flex: 1 },
  card: {
    margin: Spacing.base,
    marginBottom: 0,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  serviceRowLeft: { flex: 1 },
  serviceRowName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  serviceRowAddons: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  serviceRowPrice: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  friendCard: {
    margin: Spacing.base,
    marginBottom: 0,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  friendTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  friendSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  friendForm: {
    marginTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: '#334155',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  addressTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  addressLine: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  addressCity: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  addAddressBtn: {
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  addAddressText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  couponRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  couponInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  couponBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  couponBtnGradient: {
    paddingHorizontal: Spacing.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  couponBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#fff',
  },
  couponApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  couponAppliedLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  couponAppliedIcon: { fontSize: 20 },
  couponAppliedCode: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.success,
  },
  couponAppliedSaving: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.success,
  },
  removeCouponText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  couponError: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFade,
  },
  paymentIcon: { fontSize: 20 },
  paymentLabel: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  paymentLabelSelected: { color: Colors.textPrimary },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  billLabelHighlight: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
  },
  billValue: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  billValueHighlight: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.base,
  },
  footerTotal: { gap: 2 },
  footerTotalLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  footerTotalValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  placeBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  placeBtnGradient: {
    paddingHorizontal: Spacing.xl,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: '#fff',
  },
  loadingBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
