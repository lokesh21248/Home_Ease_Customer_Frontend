/**
 * WorkerNavigationMarker — Re-exporting MovingWorkerWoman3D for backward compatibility.
 * Code-drawn realistic 3D-style walking female worker marker.
 */

import React from 'react';
import { MovingWorkerWoman3D, WorkerFix } from './MovingWorkerWoman3D';
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
  zIndex = 999,
}) => {
  const timestampRef = React.useRef(0);
  if (timestampRef.current === 0) {
    timestampRef.current = 1700000000000;
  }

  const worker: WorkerFix = React.useMemo(
    () => ({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      heading: heading,
      timestampMs: timestampRef.current,
    }),
    [coordinate.latitude, coordinate.longitude, heading],
  );

  return <MovingWorkerWoman3D worker={worker} zIndex={zIndex} />;
};

export default WorkerNavigationMarker;
