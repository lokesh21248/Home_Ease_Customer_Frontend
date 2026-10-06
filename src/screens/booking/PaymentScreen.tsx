import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useBooking } from '../../context/BookingContext';
import { paymentApi } from '../../api/paymentApi';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type PaymentNavProp = StackNavigationProp<RootStackParamList, 'Payment'>;

interface Props {
  navigation: PaymentNavProp;
}

type PaymentMethodType = 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'Cash';

export const PaymentScreen: React.FC<Props> = ({ navigation }) => {
  const { pricing, createBooking } = useBooking();

  const [method, setMethod] = useState<PaymentMethodType>('UPI');
  const [upiId, setUpiId] = useState('lokesh@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (method === 'UPI' && !upiId.trim()) {
      Alert.alert('UPI ID Required', 'Please provide a valid UPI ID (e.g. name@okaxis)');
      return;
    }
    if (method === 'Card') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 16) {
        Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number.');
        return;
      }
    }

    setLoading(true);
    try {
      // Process through payment API
      await paymentApi.processPayment({
        amount: pricing.total,
        method,
        upiId: method === 'UPI' ? upiId : undefined,
      });

      // Create booking record
      const booking = await createBooking(method);

      // Navigate to BookingConfirmation
      navigation.replace('BookingConfirmation', { booking });
    } catch (err: any) {
      Alert.alert('Payment Failed', err.message || 'Payment could not be processed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Payment" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Total Amount Card */}
        <View style={[styles.amountCard, SHADOWS.card]}>
          <Text style={styles.amountLabel}>Total Amount to Pay</Text>
          <Text style={styles.amountValue}>₹{pricing.total}</Text>
          <Text style={styles.secureText}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.success} /> 100% Safe & Secure 256-bit Encrypted
          </Text>
        </View>

        {/* Method 1: UPI */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setMethod('UPI')}
          style={[styles.methodCard, method === 'UPI' && styles.methodCardActive, SHADOWS.subtle]}
        >
          <View style={styles.methodHeader}>
            <View style={styles.methodIconCircle}>
              <MaterialCommunityIcons name="integrated-circuit-chip" size={20} color={COLORS.primaryDark} />
            </View>
            <View style={styles.methodTitleBox}>
              <Text style={styles.methodTitle}>UPI (Instant Pay)</Text>
              <Text style={styles.methodSubtitle}>Google Pay, PhonePe, Paytm, BHIM</Text>
            </View>
            <View style={[styles.radioCircle, method === 'UPI' && styles.radioCircleActive]}>
              {method === 'UPI' && <View style={styles.radioDot} />}
            </View>
          </View>

          {method === 'UPI' && (
            <View style={styles.methodBody}>
              <Text style={styles.inputLabel}>Enter UPI ID / VPA</Text>
              <TextInput
                value={upiId}
                onChangeText={setUpiId}
                placeholder="username@bank"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                style={styles.innerInput}
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Method 2: Credit / Debit Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setMethod('Card')}
          style={[styles.methodCard, method === 'Card' && styles.methodCardActive, SHADOWS.subtle]}
        >
          <View style={styles.methodHeader}>
            <View style={styles.methodIconCircle}>
              <Ionicons name="card-outline" size={20} color={COLORS.primaryDark} />
            </View>
            <View style={styles.methodTitleBox}>
              <Text style={styles.methodTitle}>Credit / Debit Card</Text>
              <Text style={styles.methodSubtitle}>Visa, Mastercard, RuPay, Maestro</Text>
            </View>
            <View style={[styles.radioCircle, method === 'Card' && styles.radioCircleActive]}>
              {method === 'Card' && <View style={styles.radioDot} />}
            </View>
          </View>

          {method === 'Card' && (
            <View style={styles.methodBody}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput
                value={cardNumber}
                onChangeText={setCardNumber}
                placeholder="4532 •••• •••• 8921"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={19}
                style={styles.innerInput}
              />
              <View style={styles.cardRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Expiry (MM/YY)</Text>
                  <TextInput
                    value={cardExpiry}
                    onChangeText={setCardExpiry}
                    placeholder="12/28"
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={5}
                    style={styles.innerInput}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    value={cardCvv}
                    onChangeText={setCardCvv}
                    placeholder="123"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    style={styles.innerInput}
                  />
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Method 3: Net Banking */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setMethod('NetBanking')}
          style={[styles.methodCard, method === 'NetBanking' && styles.methodCardActive, SHADOWS.subtle]}
        >
          <View style={styles.methodHeader}>
            <View style={styles.methodIconCircle}>
              <Ionicons name="business-outline" size={20} color={COLORS.primaryDark} />
            </View>
            <View style={styles.methodTitleBox}>
              <Text style={styles.methodTitle}>Net Banking</Text>
              <Text style={styles.methodSubtitle}>All Indian major banks supported</Text>
            </View>
            <View style={[styles.radioCircle, method === 'NetBanking' && styles.radioCircleActive]}>
              {method === 'NetBanking' && <View style={styles.radioDot} />}
            </View>
          </View>

          {method === 'NetBanking' && (
            <View style={styles.bankPillsRow}>
              {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank'].map((b) => (
                <TouchableOpacity
                  key={b}
                  onPress={() => setSelectedBank(b)}
                  style={[
                    styles.bankPill,
                    selectedBank === b && styles.bankPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.bankPillText,
                      selectedBank === b && styles.bankPillTextActive,
                    ]}
                  >
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* Method 4: Wallets */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setMethod('Wallet')}
          style={[styles.methodCard, method === 'Wallet' && styles.methodCardActive, SHADOWS.subtle]}
        >
          <View style={styles.methodHeader}>
            <View style={styles.methodIconCircle}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primaryDark} />
            </View>
            <View style={styles.methodTitleBox}>
              <Text style={styles.methodTitle}>Wallets</Text>
              <Text style={styles.methodSubtitle}>HomeEase Wallet (₹250), Amazon Pay, Paytm</Text>
            </View>
            <View style={[styles.radioCircle, method === 'Wallet' && styles.radioCircleActive]}>
              {method === 'Wallet' && <View style={styles.radioDot} />}
            </View>
          </View>
        </TouchableOpacity>

        {/* Method 5: Cash on Delivery / After Service */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setMethod('Cash')}
          style={[styles.methodCard, method === 'Cash' && styles.methodCardActive, SHADOWS.subtle]}
        >
          <View style={styles.methodHeader}>
            <View style={styles.methodIconCircle}>
              <Ionicons name="cash-outline" size={20} color={COLORS.primaryDark} />
            </View>
            <View style={styles.methodTitleBox}>
              <Text style={styles.methodTitle}>Pay After Service</Text>
              <Text style={styles.methodSubtitle}>Cash or UPI directly to the professional</Text>
            </View>
            <View style={[styles.radioCircle, method === 'Cash' && styles.radioCircleActive]}>
              {method === 'Cash' && <View style={styles.radioDot} />}
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Bottom Pay Button */}
      <View style={[styles.bottomBar, SHADOWS.card]}>
        <Button
          title={`Pay ₹${pricing.total}`}
          onPress={handlePay}
          loading={loading}
          variant="primary"
          size="lg"
          style={{ width: '100%' }}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xs,
    paddingBottom: 110,
  },
  amountCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  amountLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primaryDark,
    marginVertical: 4,
  },
  secureText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
    marginTop: 4,
  },
  methodCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  methodCardActive: {
    borderColor: COLORS.primaryDark,
    backgroundColor: '#FFFFFF',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIconCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(235, 245, 240, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodTitleBox: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  methodSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: 'rgba(50, 100, 80, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: COLORS.primaryDark,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryDark,
  },
  methodBody: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(50, 100, 80, 0.1)',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginBottom: 6,
  },
  innerInput: {
    backgroundColor: 'rgba(245, 250, 248, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(50, 100, 80, 0.2)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: COLORS.primaryDark,
    fontWeight: '600',
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
  },
  bankPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  bankPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(235, 245, 240, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(50, 100, 80, 0.15)',
  },
  bankPillActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentHover,
  },
  bankPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  bankPillTextActive: {
    fontWeight: '700',
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
});
