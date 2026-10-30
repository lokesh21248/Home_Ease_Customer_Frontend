import { useEffect, useState } from 'react';
import {
  getActiveLocation,
  type ProviderLocation,
} from '../api/trackingApi';

export function useCustomerTracking(
  bookingId: string | null,
  token?: string,
  enabled = true
) {
  const [provider, setProvider] = useState<ProviderLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId || !enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const result = await getActiveLocation(bookingId, token);

        if (!cancelled) {
          const valid =
            Number.isFinite(result.latitude) &&
            Number.isFinite(result.longitude) &&
            Math.abs(result.latitude) <= 90 &&
            Math.abs(result.longitude) <= 180 &&
            !(result.latitude === 0 && result.longitude === 0);

          if (valid) {
            setProvider(result);
            setError(null);
          } else {
            setError('The provider location is invalid.');
          }
        }
      } catch {
        if (!cancelled) {
          setError('Unable to refresh provider location.');
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(poll, 5000);
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [bookingId, token, enabled]);

  return { provider, error };
}

export default useCustomerTracking;
