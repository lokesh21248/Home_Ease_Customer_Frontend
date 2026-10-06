import apiClient from './axiosInstance';
import { TrackingData } from '../types';
import { MOCK_PROFESSIONAL } from '../constants/mockData';

export const trackingApi = {
  // GET /bookings/{bookingId}
  getLiveTracking: async (bookingId: string): Promise<TrackingData> => {
    try {
      const res = await apiClient.get<any>(`/bookings/${bookingId}`);
      const data = res.data;
      return {
        bookingId: data.bookingId || bookingId,
        workerId: data.workerId,
        workerName: data.workerName || 'Ramesh Kumar',
        workerPhone: data.workerPhone || '+919123456780',
        pinCode: data.pinCode || '4821', // 4-digit security PIN
        status: data.status || 'IN_PROGRESS',
        totalAmount: data.totalAmount || 918.20,
        paymentStatus: data.paymentStatus || 'COMPLETED',
        professional: {
          id: data.workerId || MOCK_PROFESSIONAL.id,
          name: data.workerName || MOCK_PROFESSIONAL.name,
          role: 'Home Cleaning Professional',
          rating: 4.9,
          reviewsCount: 320,
          phone: data.workerPhone || MOCK_PROFESSIONAL.phone,
          avatarUrl: MOCK_PROFESSIONAL.avatarUrl,
          completedJobsCount: 480,
        },
        estimatedArrivalMinutes: 8,
        distanceKm: 1.2,
        currentLocation: {
          latitude: 17.4912,
          longitude: 78.3912,
        },
        customerLocation: {
          latitude: 17.4938,
          longitude: 78.3986,
        },
      };
    } catch {
      return {
        bookingId,
        workerId: '6f2e1a3b-4c5d-6e7f-6a9b-1c2d3e4f5a6b',
        workerName: 'Ramesh Kumar',
        workerPhone: '+919123456780',
        pinCode: '4821', // 4-digit security PIN from guide
        professional: MOCK_PROFESSIONAL,
        status: 'IN_PROGRESS',
        estimatedArrivalMinutes: 8,
        distanceKm: 1.2,
        currentLocation: {
          latitude: 17.4912,
          longitude: 78.3912,
        },
        customerLocation: {
          latitude: 17.4938,
          longitude: 78.3986,
        },
      };
    }
  },
};
