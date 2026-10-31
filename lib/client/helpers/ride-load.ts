import { ZONE_MID_PERCENT } from '@/lib/client/models/zones';
import type { Ride } from '@/lib/client/models/types';

// Normalized power of a workout written as zones. Each block is ridden at the
// middle of its Coggan range (zone 7 at 175%). Intensity factor is that
// normalized power divided by FTP, which cancels out, so the score does not
// depend on the rider's FTP. TSS is the usual hour-scaled IF squared.
export type RideLoad = {
  intensityFactor: number;
  tss: number;
  thresholdSeconds: number;
};

export default function rideLoad(ride: Ride): RideLoad {
  let fourthPowerSeconds = 0;
  let totalSeconds = 0;
  let thresholdSeconds = 0;

  for (const interval of ride.intervals) {
    const intensity: number = ZONE_MID_PERCENT[interval.zone] / 100;
    fourthPowerSeconds += intensity ** 4 * interval.seconds;
    totalSeconds += interval.seconds;
    if (interval.zone >= 4) {
      thresholdSeconds += interval.seconds;
    }
  }

  const intensityFactor: number = (fourthPowerSeconds / totalSeconds) ** 0.25;
  const tss: number = (totalSeconds / 3600) * intensityFactor * intensityFactor * 100;
  return { intensityFactor, tss, thresholdSeconds };
}
