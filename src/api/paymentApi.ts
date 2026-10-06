import apiClient from './axiosInstance';
import { PaymentDetails } from '../types';

export interface ProcessPaymentPayload {
  bookingId?: string;
  amount: number;
  method: 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'Cash';
  upiId?: string;
  cardDetails?: {
    last4: string;
    cardHolder: string;
  };
}

export const paymentApi = {
  processPayment: async (payload: ProcessPaymentPayload): Promise<PaymentDetails> => {
    try {
      const res = await apiClient.post<PaymentDetails>('/payments/process', payload);
      return res.data;
    } catch {
      // Mock payment success after simulation delay
      return {
        method: payload.method,
        status: 'success',
        transactionId: 'TXN-' + Math.floor(10000000 + Math.random() * 90000000),
        paidAt: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        subtotal: payload.amount - 215,
        platformFee: 30,
        taxes: 185,
        discount: 0,
        total: payload.amount,
      };
    }
  },

  getPaymentHistory: async (): Promise<PaymentDetails[]> => {
    try {
      const res = await apiClient.get<PaymentDetails[]>('/payments/history');
      return res.data;
    } catch {
      return [
        {
          method: 'UPI',
          status: 'success',
          transactionId: 'TXN-98421094',
          paidAt: '18 Sep 2026, 04:30 PM',
          subtotal: 999,
          platformFee: 30,
          taxes: 185,
          discount: 0,
          total: 1214,
        },
        {
          method: 'Card',
          status: 'success',
          transactionId: 'TXN-55219082',
          paidAt: '20 Sep 2026, 11:15 AM',
          subtotal: 499,
          platformFee: 30,
          taxes: 95,
          discount: 50,
          total: 574,
        },
        {
          method: 'UPI',
          status: 'success',
          transactionId: 'TXN-31849102',
          paidAt: '10 Aug 2026, 09:45 AM',
          subtotal: 250,
          platformFee: 20,
          taxes: 48,
          discount: 0,
          total: 318,
        },
      ];
    }
  },
};
