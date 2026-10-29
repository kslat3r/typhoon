import { CADENCE_BANDS } from '@/lib/client/models/cadence-bands';
import type { Ride } from '@/lib/client/models/types';

// Seconds from the given interval until the cadence band changes
export default function bandStretchSeconds(ride: Ride, fromIndex: number): number {
  const band = CADENCE_BANDS[ride.intervals[fromIndex].zone];
  let seconds = 0;

  for (let index = fromIndex; index < ride.intervals.length; index += 1) {
    const interval = ride.intervals[index];
    if (CADENCE_BANDS[interval.zone] !== band) {
      break;
    }
    seconds += interval.seconds;
  }

  return seconds;
}
