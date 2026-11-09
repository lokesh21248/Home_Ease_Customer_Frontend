/**
 * TrackingLifecycleManager.ts
 *
 * Authoritative client-side tracking lifecycle coordinator for HomeEase Customer App.
 *
 * Implements Pronto-style live tracking lifecycle:
 * - CREATED: Booking accepted, partner preparing.
 * - ACTIVE: Partner travelling, live GPS stream + ETA + route active.
 * - ARRIVED: Partner at customer doorstep. Live travel tracking STOPPED immediately.
 *            0 GPS polling, 0 route recalculation, 0 Directions API calls.
 * - STOPPED: Service in progress, completed, or cancelled. All tracking resources cleared.
 *
 * Prevents unintended restarts on app foreground or network reconnects once arrived.
 */

export type TrackingLifecycleState = 'CREATED' | 'ACTIVE' | 'ARRIVED' | 'STOPPED';

export interface TrackingLifecycleEvent {
  type:
    | 'WORKER_ON_THE_WAY'
    | 'WORKER_LOCATION_UPDATED'
    | 'WORKER_ARRIVED'
    | 'BOOKING_TRACKING_STOPPED'
    | 'SERVICE_STARTED'
    | 'SERVICE_COMPLETED'
    | 'BOOKING_CANCELLED';
  bookingId: string;
  trackingActive: boolean;
  state: TrackingLifecycleState;
  reason?: string;
  message?: string;
  timestamp: number;
}

type EventListener = (event: TrackingLifecycleEvent) => void;

class TrackingLifecycleManager {
  private static instance: TrackingLifecycleManager;

  // Keyed by bookingId
  private sessionStates = new Map<string, TrackingLifecycleState>();
  private listeners = new Map<string, Set<EventListener>>();
  private abortControllers = new Map<string, AbortController>();

  private constructor() {}

  public static getInstance(): TrackingLifecycleManager {
    if (!TrackingLifecycleManager.instance) {
      TrackingLifecycleManager.instance = new TrackingLifecycleManager();
    }
    return TrackingLifecycleManager.instance;
  }

  /**
   * Evaluates whether live travel tracking is authorized for the given booking stage.
   * STRICT: ONLY true during travel stage (ON_THE_WAY or ACCEPTED/CONFIRMED before arrival).
   * ALWAYS returns FALSE once ARRIVED, IN_PROGRESS, COMPLETED, or CANCELLED.
   */
  public isTravelTrackingAuthorized(bookingId?: string, bookingStatus?: string): boolean {
    if (!bookingId) return false;

    // Check cached state
    const cachedState = this.sessionStates.get(bookingId);
    if (cachedState === 'ARRIVED' || cachedState === 'STOPPED') {
      return false;
    }

    if (!bookingStatus) return false;

    const normalized = bookingStatus.trim().toUpperCase();
    if (
      normalized === 'ARRIVED' ||
      normalized === 'IN_PROGRESS' ||
      normalized === 'COMPLETED' ||
      normalized === 'CANCELLED' ||
      normalized === 'SEARCHING' ||
      normalized === 'PENDING'
    ) {
      return false;
    }

    return normalized === 'ON_THE_WAY' || normalized === 'ACCEPTED' || normalized === 'CONFIRMED';
  }

  /**
   * Retrieves an AbortController for in-flight tracking network requests (polling, routing).
   */
  public getOrCreateAbortController(bookingId: string): AbortController {
    let controller = this.abortControllers.get(bookingId);
    if (!controller || controller.signal.aborted) {
      controller = new AbortController();
      this.abortControllers.set(bookingId, controller);
    }
    return controller;
  }

  /**
   * Immediately aborts in-flight requests and resets the controller.
   */
  public abortInFlightRequests(bookingId: string): void {
    const controller = this.abortControllers.get(bookingId);
    if (controller && !controller.signal.aborted) {
      try {
        controller.abort();
      } catch {
        // Ignored
      }
    }
    this.abortControllers.delete(bookingId);
  }

  /**
   * Marks a booking tracking session as ACTIVE (partner travelling).
   */
  public markTravelling(bookingId: string): void {
    this.sessionStates.set(bookingId, 'ACTIVE');
    this.emitEvent({
      type: 'WORKER_ON_THE_WAY',
      bookingId,
      trackingActive: true,
      state: 'ACTIVE',
      message: 'Service partner is on the way to your location.',
      timestamp: Date.now(),
    });
  }

  /**
   * CRITICAL: Marks a booking tracking session as ARRIVED.
   * Immediately aborts in-flight network requests and dispatches stop events.
   */
  public markArrived(bookingId: string, message?: string): void {
    this.sessionStates.set(bookingId, 'ARRIVED');
    this.abortInFlightRequests(bookingId);

    // Dispatch WORKER_ARRIVED
    this.emitEvent({
      type: 'WORKER_ARRIVED',
      bookingId,
      trackingActive: false,
      state: 'ARRIVED',
      message: message || 'Your service partner has arrived at your location.',
      timestamp: Date.now(),
    });

    // Dispatch BOOKING_TRACKING_STOPPED
    this.emitEvent({
      type: 'BOOKING_TRACKING_STOPPED',
      bookingId,
      trackingActive: false,
      state: 'ARRIVED',
      reason: 'WORKER_ARRIVED',
      message: 'Live travel tracking has concluded upon partner arrival.',
      timestamp: Date.now(),
    });
  }

  /**
   * Permanently stops tracking session (e.g. IN_PROGRESS, COMPLETED, CANCELLED).
   */
  public stopTracking(bookingId: string, reason: string): void {
    this.sessionStates.set(bookingId, 'STOPPED');
    this.abortInFlightRequests(bookingId);

    this.emitEvent({
      type: 'BOOKING_TRACKING_STOPPED',
      bookingId,
      trackingActive: false,
      state: 'STOPPED',
      reason,
      message: `Live tracking stopped: ${reason}`,
      timestamp: Date.now(),
    });
  }

  /**
   * Ingests a raw event received from WebSockets or HTTP responses.
   */
  public processRemoteEvent(bookingId: string, rawEvent: any): void {
    if (!bookingId || !rawEvent) return;

    const eventType = rawEvent.type || rawEvent.status;
    const isStopped =
      eventType === 'WORKER_ARRIVED' ||
      eventType === 'ARRIVED' ||
      eventType === 'BOOKING_TRACKING_STOPPED' ||
      eventType === 'TRACKING_STOPPED' ||
      eventType === 'SERVICE_STARTED' ||
      eventType === 'IN_PROGRESS' ||
      eventType === 'COMPLETED' ||
      eventType === 'CANCELLED' ||
      rawEvent.trackingActive === false;

    if (eventType === 'ARRIVED' || eventType === 'WORKER_ARRIVED') {
      this.markArrived(bookingId, rawEvent.message);
    } else if (isStopped) {
      this.stopTracking(bookingId, eventType);
    } else if (eventType === 'WORKER_ON_THE_WAY' || eventType === 'ON_THE_WAY') {
      if (this.sessionStates.get(bookingId) !== 'ARRIVED') {
        this.markTravelling(bookingId);
      }
    }
  }

  /**
   * Retrieves the current tracking lifecycle state for a booking.
   */
  public getState(bookingId: string): TrackingLifecycleState {
    return this.sessionStates.get(bookingId) || 'CREATED';
  }

  /**
   * Subscribes a listener to tracking lifecycle events for a specific booking.
   */
  public subscribe(bookingId: string, listener: EventListener): () => void {
    if (!this.listeners.has(bookingId)) {
      this.listeners.set(bookingId, new Set());
    }
    this.listeners.get(bookingId)!.add(listener);

    return () => {
      const set = this.listeners.get(bookingId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(bookingId);
        }
      }
    };
  }

  /**
   * Resets session memory for a booking (e.g. unmount or navigation away).
   */
  public clearSession(bookingId: string): void {
    this.abortInFlightRequests(bookingId);
    this.sessionStates.delete(bookingId);
    this.listeners.delete(bookingId);
  }

  private emitEvent(event: TrackingLifecycleEvent): void {
    const set = this.listeners.get(event.bookingId);
    if (set) {
      set.forEach((fn) => {
        try {
          fn(event);
        } catch (e) {
          console.warn('[TrackingLifecycleManager] Listener error:', e);
        }
      });
    }
  }
}

export const trackingLifecycleManager = TrackingLifecycleManager.getInstance();
