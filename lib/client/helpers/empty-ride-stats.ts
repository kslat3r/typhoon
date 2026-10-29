import type { RideStats } from '@/lib/client/models/types';

export default function emptyRideStats(): RideStats {
  return {
    sampledSeconds: 0,
    missingSeconds: 0,
    wattSeconds: 0,
    maxWatts: 0,
    miles: 0,
    secondsInZone: [0, 0, 0, 0, 0, 0],
  };
}
