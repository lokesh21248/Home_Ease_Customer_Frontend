/**
 * useBookingStatus – polls GET /api/v1/bookings/{id}/status every 5 seconds
 * and exposes the truthful booking state machine status to the UI.
 *
 * Returned statuses (matching BookingStage enum on backend):
 *   PENDING | REQUESTED | SEARCHING | ACCEPTED | ON_THE_WAY | ARRIVED |
 *   IN_PROGRESS | COMPLETED | CANCELLED | WORKER_NOT_FOUND
 */

import { useEffect, useRef, useState } from 'react';
import { BASE_URL } from '../api/client';

export type BookingStage =
  | 'PENDING'
  | 'REQUESTED'
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'WORKER_NOT_FOUND'
  | null;

export interface BookingStatusData {
  bookingId: string;
  status: BookingStage;
  workerAssigned: boolean;
  workerId?: string;
  workerName?: string;
  workerPhone?: string;
  workerAvatarUrl?: string;
  pinCode?: string;
  estimatedArrivalMinutes?: number;
  trackingActive?: boolean;
}

export function useBookingStatus(
  bookingId: string | null | undefined,
  token?: string | null,
  pollingIntervalMs = 5000
) {
  const [data, setData] = useState<BookingStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    cancelledRef.current = false;

    const fetchStatus = async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
          `${BASE_URL}/bookings/${bookingId}/status`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();

        if (!cancelledRef.current) {
          setData({
            bookingId: json.bookingId ?? bookingId,
            status: (json.status as BookingStage) ?? null,
            workerAssigned: json.workerAssigned ?? false,
            workerId: json.workerId,
            workerName: json.workerName,
            workerPhone: json.workerPhone,
            workerAvatarUrl: json.workerAvatarUrl,
            pinCode: json.pinCode,
            estimatedArrivalMinutes: json.estimatedArrivalMinutes,
            trackingActive: json.trackingActive ?? false,
          });
          setError(null);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelledRef.current) {
          setError(err?.message ?? 'Failed to fetch booking status');
          setLoading(false);
        }
      } finally {
        // Schedule next poll (stop if terminal state reached)
        if (!cancelledRef.current) {
          const currentStatus = data?.status;
          const isTerminal =
            currentStatus === 'COMPLETED' ||
            currentStatus === 'CANCELLED' ||
            currentStatus === 'WORKER_NOT_FOUND';
          if (!isTerminal) {
            timerRef.current = setTimeout(fetchStatus, pollingIntervalMs);
          }
        }
      }
    };

    void fetchStatus();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, token]);

  return { data, loading, error };
}

