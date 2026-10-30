/**
 * HomeEase Wallet Screen — Balance, Top-Up & Transaction History.
 * Route: /profile/wallet
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';
import { useWallet } from '../../src/hooks/useWallet';
import { Colors, Typography, Shadows } from '../../src/constants/theme';
import { getHeaderTopPadding } from '../../src/constants/layout';

const QUICK_AMOUNTS = [100, 500, 1000, 2000];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { balance, transactions, loading, addMoney } = useWallet();

  const [topUpAmount, setTopUpAmount] = useState('500');
  const [filter, setFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [addingMoney, setAddingMoney] = useState(false);

  const handleQuickSelect = (amt: number) => {
    setTopUpAmount(String(amt));
  };

  const handleAddMoney = async () => {
    const num = parseInt(topUpAmount, 10);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to add to your wallet.');
      return;
    }
    if (num > 50000) {
      Alert.alert('Limit Exceeded', 'Maximum single top-up limit is ₹50,000.');
      return;
    }

    setAddingMoney(true);
    try {
      const success = await addMoney(num, 'Wallet Top-Up');
      if (success) {
        Alert.alert(
          'Money Added Successfully!',
          `₹${num.toLocaleString('en-IN')} has been added to your HomeEase Wallet.`
        );
        setTopUpAmount('500');
      } else {
        Alert.alert('Top-Up Failed', 'Unable to complete the transaction. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setAddingMoney(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'ALL') return true;
    return tx.type === filter;
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ─── Blue Header ─── */}
      <View style={[styles.header, { paddingTop: getHeaderTopPadding(insets.top, 10) }]}>
        <View style={styles.headerTopRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>HomeEase Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ─── Balance Hero Card ─── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.walletIconWrap}>
              <Wallet size={22} color="#FFFFFF" />
            </View>
            <View style={styles.secureTag}>
              <ShieldCheck size={14} color="#10B981" />
              <Text style={styles.secureText}>100% Protected</Text>
            </View>
          </View>

          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceValue}>
            ₹{loading ? '...' : balance.toLocaleString('en-IN')}
          </Text>

          <View style={styles.heroFooter}>
            <Text style={styles.heroSubtitle}>
              Usable for all bookings, instant refunds & cashbacks
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Add Money Section ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Add Money to Wallet</Text>
            <View style={styles.cashbackBadge}>
              <Sparkles size={12} color="#D97706" />
              <Text style={styles.cashbackBadgeText}>5% Extra Cashback</Text>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="number-pad"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              maxLength={6}
            />
          </View>

          {/* Quick Amount Pills */}
          <View style={styles.quickPillsRow}>
            {QUICK_AMOUNTS.map((amt) => {
              const isSelected = topUpAmount === String(amt);
              return (
                <Pressable
                  key={amt}
                  style={[styles.quickPill, isSelected && styles.quickPillActive]}
                  onPress={() => handleQuickSelect(amt)}
                >
                  <Text style={[styles.quickPillText, isSelected && styles.quickPillTextActive]}>
                    +₹{amt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Add Money Button */}
          <Pressable
            style={[styles.addMoneyBtn, addingMoney && styles.addMoneyBtnDisabled]}
            onPress={handleAddMoney}
            disabled={addingMoney}
          >
            {addingMoney ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.addMoneyBtnText}>
                  Add ₹{topUpAmount || '0'} to Wallet
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* ─── Wallet Benefits Banner ─── */}
        <View style={styles.benefitsRow}>
          <View style={styles.benefitItem}>
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={styles.benefitText}>1-Click Checkout</Text>
          </View>
          <View style={styles.benefitItem}>
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={styles.benefitText}>Instant Refunds</Text>
          </View>
          <View style={styles.benefitItem}>
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={styles.benefitText}>No Expiry</Text>
          </View>
        </View>

        {/* ─── Transaction History ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {(['ALL', 'CREDIT', 'DEBIT'] as const).map((tab) => {
              const active = filter === tab;
              const label = tab === 'ALL' ? 'All' : tab === 'CREDIT' ? 'Credited (+)' : 'Debited (-)';
              return (
                <Pressable
                  key={tab}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(tab)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'ALL'
                  ? 'Your wallet activity will appear here.'
                  : `No ${filter.toLowerCase()} transactions recorded yet.`}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((tx) => {
              const isCredit = tx.type === 'CREDIT';
              const formattedDate = new Date(tx.date).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <View key={tx.id} style={styles.txRow}>
                  <View
                    style={[
                      styles.txIconBox,
                      isCredit ? styles.txIconBoxCredit : styles.txIconBoxDebit,
                    ]}
                  >
                    {isCredit ? (
                      <ArrowDownLeft size={18} color="#10B981" />
                    ) : (
                      <ArrowUpRight size={18} color="#EF4444" />
                    )}
                  </View>

                  <View style={styles.txDetails}>
                    <Text style={styles.txTitle}>{tx.title}</Text>
                    <Text style={styles.txSubtitle}>
                      {tx.subtitle || (tx.referenceId ? `Ref: ${tx.referenceId}` : '')}
                    </Text>
                    <Text style={styles.txDate}>{formattedDate}</Text>
                  </View>

                  <View style={styles.txAmountCol}>
                    <Text
                      style={[
                        styles.txAmount,
                        isCredit ? styles.txAmountCredit : styles.txAmountDebit,
                      ]}
                    >
                      {isCredit ? `+₹${tx.amount.toLocaleString('en-IN')}` : `-₹${tx.amount.toLocaleString('en-IN')}`}
                    </Text>
                    <Text style={styles.txStatusBadge}>Completed</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F8',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },

  // ─── Balance Hero Card ───
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  walletIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  secureText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11,
    color: '#065F46',
  },
  balanceLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 36,
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 10,
  },
  heroFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 10,
  },
  heroSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // ─── Scroll Area ───
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // ─── Section Card ───
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    ...Shadows.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#111827',
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  cashbackBadgeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11,
    color: '#92400E',
  },

  // ─── Amount Input ───
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 14,
  },
  currencySymbol: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 24,
    color: '#111827',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: Typography.fontFamily.bold,
    fontSize: 24,
    color: '#111827',
  },

  // ─── Quick Pills ───
  quickPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  quickPill: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPillActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  quickPillText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: '#4B5563',
  },
  quickPillTextActive: {
    color: Colors.primary,
  },

  // ─── Add Money Button ───
  addMoneyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  addMoneyBtnDisabled: {
    opacity: 0.7,
  },
  addMoneyBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },

  // ─── Benefits Row ───
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benefitText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: '#1E40AF',
  },

  // ─── Filters ───
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.semiBold,
  },

  // ─── Transaction Item ───
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIconBoxCredit: {
    backgroundColor: '#ECFDF5',
  },
  txIconBoxDebit: {
    backgroundColor: '#FEF2F2',
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: '#111827',
  },
  txSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  txDate: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
  },
  txAmountCredit: {
    color: '#10B981',
  },
  txAmountDebit: {
    color: '#EF4444',
  },
  txStatusBadge: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: '#6B7280',
    marginTop: 3,
  },

  // ─── Empty State ───
  emptyTransactions: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
