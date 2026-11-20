/**
 * WorkerNavigationMarker — Re-exporting MovingWorker3DMarker for backward compatibility.
 * Replaces the legacy top-down blue disc/arrow with the realistic 3D scooter rider.
 */

import React from 'react';
import { MovingWorker3DMarker, WorkerGPS } from './MovingWorker3DMarker';
import { LatLngCoordinate } from '../../services/coordinates';

export interface WorkerNavigationMarkerProps {
  coordinate: LatLngCoordinate;
  heading?: number;
  name?: string;
  speed?: number;
  zIndex?: number;
  isLive?: boolean;
}

export const WorkerNavigationMarker: React.FC<WorkerNavigationMarkerProps> = ({
  coordinate,
  heading = 0,
  name = 'Service Partner',
  zIndex = 999,
}) => {
  const timestampRef = React.useRef(0);
  if (timestampRef.current === 0) {
    timestampRef.current = 1700000000000;
  }

  const worker: WorkerGPS = React.useMemo(
    () => ({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      heading: heading,
      timestampMs: timestampRef.current,
    }),
    [coordinate.latitude, coordinate.longitude, heading],
  );

  return <MovingWorker3DMarker worker={worker} name={name} zIndex={zIndex} />;
};

export default WorkerNavigationMarker;
