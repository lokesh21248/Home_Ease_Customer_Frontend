/**
 * Wallet Context — Central state provider for customer wallet balance & transactions.
 * Changes to wallet balance reflect immediately on HomeScreen, ProfileScreen, and WalletScreen.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  WalletTransaction,
  getWalletData,
  addWalletMoney,
  deductWalletMoney,
} from '../services/walletService';

export interface WalletContextType {
  balance: number;
  transactions: WalletTransaction[];
  loading: boolean;
  addMoney: (amount: number, description?: string) => Promise<boolean>;
  deductMoney: (amount: number, description: string) => Promise<boolean>;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<number>(500);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadWallet = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWalletData();
      setBalance(data.balance);
      setTransactions(data.transactions);
    } catch (err) {
      console.warn('[WalletContext] Failed to load wallet data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const addMoney = useCallback(
    async (amount: number, description: string = 'Wallet Top-Up'): Promise<boolean> => {
      try {
        const updated = await addWalletMoney(amount, description);
        setBalance(updated.balance);
        setTransactions(updated.transactions);
        return true;
      } catch (err) {
        console.warn('[WalletContext] Add money error:', err);
        return false;
      }
    },
    []
  );

  const deductMoney = useCallback(
    async (amount: number, description: string = 'Booking Payment'): Promise<boolean> => {
      try {
        const updated = await deductWalletMoney(amount, description);
        setBalance(updated.balance);
        setTransactions(updated.transactions);
        return true;
      } catch (err) {
        console.warn('[WalletContext] Deduct money error:', err);
        return false;
      }
    },
    []
  );

  return (
    <WalletContext.Provider
      value={{
        balance,
        transactions,
        loading,
        addMoney,
        deductMoney,
        refreshWallet: loadWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
