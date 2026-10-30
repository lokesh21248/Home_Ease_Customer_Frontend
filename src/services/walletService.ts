/**
 * Wallet Service — Manages HomeEase digital wallet balance, transactions,
 * top-up additions, deductions, and persistent local storage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const WALLET_STORAGE_KEY = '@homeease/wallet_data';

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  title: string;
  subtitle?: string;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  referenceId?: string;
}

export interface WalletData {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
}

const DEFAULT_INITIAL_WALLET: WalletData = {
  balance: 500,
  currency: '₹',
  transactions: [
    {
      id: 'tx-init-welcome',
      type: 'CREDIT',
      amount: 500,
      title: 'Welcome Bonus Credit',
      subtitle: 'HomeEase New User Gift',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      status: 'COMPLETED',
      referenceId: 'WB-98213',
    },
  ],
};

/**
 * Fetch wallet balance and transaction history.
 */
export async function getWalletData(): Promise<WalletData> {
  try {
    const raw = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) {
      // Initialize with default welcome bonus balance
      await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_WALLET));
      return DEFAULT_INITIAL_WALLET;
    }
    return JSON.parse(raw) as WalletData;
  } catch (error) {
    console.warn('[WalletService] getWalletData error:', error);
    return DEFAULT_INITIAL_WALLET;
  }
}

/**
 * Add money (top up) to wallet balance.
 */
export async function addWalletMoney(
  amount: number,
  description: string = 'Wallet Top-Up'
): Promise<WalletData> {
  try {
    const current = await getWalletData();
    const newTransaction: WalletTransaction = {
      id: `tx-add-${Date.now()}`,
      type: 'CREDIT',
      amount,
      title: description,
      subtitle: 'Added via UPI / Net Banking',
      date: new Date().toISOString(),
      status: 'COMPLETED',
      referenceId: `TOP-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    const updated: WalletData = {
      ...current,
      balance: current.balance + amount,
      transactions: [newTransaction, ...current.transactions],
    };

    await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('[WalletService] addWalletMoney error:', error);
    throw error;
  }
}

/**
 * Deduct money from wallet (e.g. for booking payment).
 */
export async function deductWalletMoney(
  amount: number,
  description: string = 'Service Booking Payment'
): Promise<WalletData> {
  try {
    const current = await getWalletData();
    if (current.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const newTransaction: WalletTransaction = {
      id: `tx-deduct-${Date.now()}`,
      type: 'DEBIT',
      amount,
      title: description,
      subtitle: 'Paid using HomeEase Wallet',
      date: new Date().toISOString(),
      status: 'COMPLETED',
      referenceId: `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    const updated: WalletData = {
      ...current,
      balance: current.balance - amount,
      transactions: [newTransaction, ...current.transactions],
    };

    await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('[WalletService] deductWalletMoney error:', error);
    throw error;
  }
}
