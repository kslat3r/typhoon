import speedFromWatts from '@/lib/client/helpers/speed-from-watts';
import zoneForWatts from '@/lib/client/helpers/zone-for-watts';
import type { BikeSample, RideStats } from '@/lib/client/models/types';

export default function accumulateRideStats(stats: RideStats, sample: BikeSample | null, deltaSeconds: number, ftp: number): RideStats {
  if (sample === null) {
    return {
      ...stats,
      secondsInZone: [...stats.secondsInZone],
      missingSeconds: stats.missingSeconds + deltaSeconds,
    };
  }

  const secondsInZone = [...stats.secondsInZone] as RideStats['secondsInZone'];
  secondsInZone[zoneForWatts(sample.watts, ftp) - 1] += deltaSeconds;

  return {
    sampledSeconds: stats.sampledSeconds + deltaSeconds,
    missingSeconds: stats.missingSeconds,
    wattSeconds: stats.wattSeconds + sample.watts * deltaSeconds,
    maxWatts: Math.max(stats.maxWatts, sample.watts),
    miles: stats.miles + (speedFromWatts(sample.watts) * deltaSeconds) / 3600,
    secondsInZone,
  };
}
