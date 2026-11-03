import * as Location from 'expo-location';
import { Client } from '@stomp/stompjs';
import { calculateBearing, calculateHaversineDistance } from './routing';
import { isValidCoordinate } from './coordinates';
import { trackingApi, TRACKING_WS_URL, getAuthHeaders } from '../api/client';
import { isLocationServicesEnabled } from './locationService';

export interface ServicePersonLocation {
  latitude: number;
  longitude: number;
  bearing: number;
  speed: number | null;
  accuracy: number;
  timestamp: number;
}

export interface BroadcastCallbacks {
  onLocationUpdate?: (location: ServicePersonLocation) => void;
  onBroadcastSuccess?: (timestamp: number, count: number) => void;
  onError?: (error: string) => void;
  onStatusChange?: (isBroadcasting: boolean) => void;
}

class ServicePersonTrackingManager {
  private subscription: Location.LocationSubscription | null = null;
  private stompClient: Client | null = null;
  private isBroadcasting = false;
  private activeBookingId: string | null = null;
  private lastPosition: { latitude: number; longitude: number } | null = null;
  private lastBroadcastTime = 0;
  private broadcastCount = 0;
  private callbacks: BroadcastCallbacks = {};
  private generation = 0;
  private requestController: AbortController | null = null;
  private broadcastInFlight = false;
  private accuracyWarningShown = false;

  public async startTracking(
    bookingId: string,
    callbacks?: BroadcastCallbacks,
  ): Promise<{ success: boolean; message: string }> {
    if (!bookingId.trim()) {
      return { success: false, message: 'A valid booking is required to start location sharing.' };
    }
    if (this.isBroadcasting && this.activeBookingId === bookingId) {
      this.callbacks = callbacks || this.callbacks;
      return { success: true, message: 'Tracking is already active for this booking.' };
    }

    this.stopTracking();
    const currentGeneration = ++this.generation;
    this.callbacks = callbacks || {};
    this.activeBookingId = bookingId;

    try {
      if (!(await isLocationServicesEnabled())) {
        throw new Error('Device location services are disabled. Enable GPS and try again.');
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error('Location permission was denied. Allow location access to share GPS.');
      }

      if (currentGeneration !== this.generation) {
        return { success: false, message: 'Tracking start was cancelled.' };
      }

      // Connect STOMP for live coordinate stream: WebSocket STOMP /app/tracking/update
      try {
        const authHeaders = await getAuthHeaders();
        if (authHeaders.Authorization) {
          const client = new Client({
            brokerURL: TRACKING_WS_URL,
            connectHeaders: authHeaders,
            reconnectDelay: 2000,
          });
          client.activate();
          this.stompClient = client;
        }
      } catch (stompErr) {
        console.warn('[ServicePersonTracking] STOMP activation notice:', stompErr);
      }

      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (!this.isAcceptableLocation(initial.coords)) {
        throw new Error('GPS accuracy is too low to share a reliable location. Move outdoors and retry.');
      }

      this.isBroadcasting = true;
      this.broadcastCount = 0;
      this.lastBroadcastTime = 0;
      this.callbacks.onStatusChange?.(true);
      void this.handleNewPosition(initial.coords, currentGeneration);

      if (currentGeneration !== this.generation) {
        return { success: false, message: 'Tracking start was cancelled.' };
      }

      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (location) => {
          void this.handleNewPosition(location.coords, currentGeneration);
        },
      );
      return { success: true, message: 'GPS sharing started.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start GPS sharing.';
      this.callbacks.onError?.(message);
      this.stopTracking();
      return { success: false, message };
    }
  }

  private isAcceptableLocation(coords: Location.LocationObjectCoords): boolean {
    return (
      isValidCoordinate(coords.latitude, coords.longitude) &&
      coords.accuracy !== null &&
      Number.isFinite(coords.accuracy) &&
      coords.accuracy <= 100
    );
  }

  private async handleNewPosition(
    coords: Location.LocationObjectCoords,
    currentGeneration: number,
  ): Promise<void> {
    if (
      !this.isBroadcasting ||
      !this.activeBookingId ||
      currentGeneration !== this.generation
    ) {
      return;
    }

    const accuracy = coords.accuracy;
    if (!this.isAcceptableLocation(coords) || accuracy === null) {
      if (!this.accuracyWarningShown) {
        this.callbacks.onError?.('Waiting for an accurate GPS fix before sharing location.');
        this.accuracyWarningShown = true;
      }
      return;
    }
    this.accuracyWarningShown = false;

    const previous = this.lastPosition;
    const bearing =
      typeof coords.heading === 'number' && coords.heading >= 0
        ? Math.round(coords.heading)
        : previous
          ? calculateBearing(previous.latitude, previous.longitude, coords.latitude, coords.longitude)
          : 0;
    const location: ServicePersonLocation = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      bearing,
      speed: coords.speed !== null && coords.speed >= 0 ? coords.speed * 3.6 : null,
      accuracy,
      timestamp: Date.now(),
    };

    if (
      previous &&
      calculateHaversineDistance(
        previous.latitude,
        previous.longitude,
        location.latitude,
        location.longitude,
      ) < 3 &&
      Date.now() - this.lastBroadcastTime < 15000
    ) {
      return;
    }
    this.lastPosition = { latitude: location.latitude, longitude: location.longitude };
    this.callbacks.onLocationUpdate?.(location);

    // Stream coordinates over STOMP: WebSocket STOMP /app/tracking/update
    if (this.stompClient?.connected && this.activeBookingId) {
      trackingApi.publishStompCoordinate(
        this.stompClient,
        this.activeBookingId,
        location.latitude,
        location.longitude,
      );
    }

    const now = Date.now();
    if (this.broadcastInFlight || now - this.lastBroadcastTime < 4500) return;

    this.lastBroadcastTime = now;
    this.broadcastInFlight = true;
    const controller = new AbortController();
    this.requestController = controller;
    try {
      await trackingApi.updateLocation(
        {
          bookingId: this.activeBookingId,
          lat: location.latitude,
          lng: location.longitude,
          bearing: location.bearing,
          speed: location.speed,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
        },
        controller.signal,
      );
      if (currentGeneration === this.generation && this.isBroadcasting) {
        this.broadcastCount += 1;
        this.callbacks.onBroadcastSuccess?.(location.timestamp, this.broadcastCount);
      }
    } catch (error) {
      if (!controller.signal.aborted && currentGeneration === this.generation) {
        const message = error instanceof Error ? error.message : 'Location update failed.';
        console.warn('[ServicePersonTracking] Location publish failed:', error);
        this.callbacks.onError?.(message);
      }
    } finally {
      if (this.requestController === controller) {
        this.requestController = null;
        this.broadcastInFlight = false;
      }
    }
  }

  public stopTracking(): void {
    this.generation += 1;
    this.subscription?.remove();
    this.subscription = null;
    if (this.stompClient) {
      void this.stompClient.deactivate();
      this.stompClient = null;
    }
    this.requestController?.abort();
    this.requestController = null;
    this.isBroadcasting = false;
    this.activeBookingId = null;
    this.lastPosition = null;
    this.broadcastInFlight = false;
    this.accuracyWarningShown = false;
    this.callbacks.onStatusChange?.(false);
    this.callbacks = {};
  }

  public getIsBroadcasting(): boolean {
    return this.isBroadcasting;
  }

  public getActiveBookingId(): string | null {
    return this.activeBookingId;
  }

  public getBroadcastCount(): number {
    return this.broadcastCount;
  }
}

export const servicePersonTracker = new ServicePersonTrackingManager();
