import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { paymentApi } from '../../api/paymentApi';
import { PaymentDetails } from '../../types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type PaymentsNavProp = StackNavigationProp<RootStackParamList, 'PaymentsHistory'>;

interface Props {
  navigation: PaymentsNavProp;
}

export const PaymentsScreen: React.FC<Props> = ({ navigation }) => {
  const [history, setHistory] = useState<PaymentDetails[]>([]);

  const loadHistory = async () => {
    const list = await paymentApi.getPaymentHistory();
    setHistory(list);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <ScreenWrapper>
      <Header title="Payments & Invoices" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Wallet Balance Card */}
        <View style={[styles.walletCard, SHADOWS.card]}>
          <View style={styles.walletHeader}>
            <View style={styles.walletIconCircle}>
              <Ionicons name="wallet-outline" size={24} color={COLORS.primaryDark} />
            </View>
            <View>
              <Text style={styles.walletLabel}>HomeEase Wallet</Text>
              <Text style={styles.walletBalance}>₹250.00</Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Alert.alert('Add Money', 'Wallet top-up gateway will be available in next release.')}
            style={styles.addMoneyBtn}
          >
            <Text style={styles.addMoneyText}>+ Add Money</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Transaction History */}
        <Text style={styles.sectionTitle}>Transaction History</Text>

        {history.map((item, idx) => (
          <View key={idx} style={[styles.txCard, SHADOWS.subtle]}>
            <View style={styles.txIconCircle}>
              <Ionicons
                name={item.method === 'UPI' ? 'qr-code-outline' : 'card-outline'}
                size={20}
                color={COLORS.primaryDark}
              />
            </View>

            <View style={styles.txDetails}>
              <Text style={styles.txId}>{item.transactionId}</Text>
              <Text style={styles.txDate}>{item.paidAt}</Text>
              <Text style={styles.txMethod}>Paid via {item.method}</Text>
            </View>

            <View style={styles.txAmountCol}>
              <Text style={styles.txAmount}>₹{item.total}</Text>
              <TouchableOpacity
                onPress={() => Alert.alert('Invoice', `Downloaded receipt for ${item.transactionId}`)}
              >
                <Text style={styles.invoiceLink}>Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xs,
    paddingBottom: 40,
  },
  walletCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: SPACING.lg,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletIconCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  walletBalance: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  addMoneyBtn: {
    backgroundColor: 'rgba(235, 245, 240, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(50, 100, 80, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  addMoneyText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: SPACING.sm,
  },
  txCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  txIconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(235, 245, 240, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDetails: {
    flex: 1,
    marginLeft: 12,
  },
  txId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  txDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  txMethod: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  invoiceLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
});
