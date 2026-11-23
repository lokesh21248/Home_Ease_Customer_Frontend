/**
 * MovingWorker3DMarker.tsx
 *
 * Re-exports MovingWorkerWoman3D for complete backward compatibility.
 * Replaces old scooter / motorbike asset with the code-drawn walking female service professional.
 */

import React, { memo } from 'react';
import { MovingWorkerWoman3D, WorkerFix } from './MovingWorkerWoman3D';

export interface WorkerGPS {
  latitude: number;
  longitude: number;
  heading?: number | null;
  timestampMs?: number;
}

export interface MovingWorker3DMarkerProps {
  worker: WorkerGPS;
  staleAfterMs?: number;
  name?: string;
  zIndex?: number;
  serviceCategory?: string;
  statusLabel?: string;
  isLive?: boolean;
  isGpsStale?: boolean;
}

export const MovingWorker3DMarker: React.FC<MovingWorker3DMarkerProps> = memo(
  function MovingWorker3DMarker({
    worker,
    name = 'Service Partner',
    zIndex = 999,
    serviceCategory,
    statusLabel,
    isLive = false,
    isGpsStale = false,
  }) {
    const fix: WorkerFix = {
      latitude: worker.latitude,
      longitude: worker.longitude,
      heading: worker.heading,
      timestampMs: worker.timestampMs,
    };

    return (
      <MovingWorkerWoman3D
        worker={fix}
        name={name}
        zIndex={zIndex}
        serviceCategory={serviceCategory}
        statusLabel={statusLabel}
        isLive={isLive}
        isGpsStale={isGpsStale}
      />
    );
  }
);

export default MovingWorker3DMarker;
