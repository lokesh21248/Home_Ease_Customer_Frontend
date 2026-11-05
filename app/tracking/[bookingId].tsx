import React from 'react';
import TrackingScreen from '../booking/track/[id]';

/**
 * Live Tracking Screen Route: /tracking/[bookingId]
 * Uses native Google Maps for authorized live booking tracking.
 */
export default function TrackingBookingRoute() {
  return <TrackingScreen />;
}
