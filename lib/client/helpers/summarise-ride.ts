import type { Ride, RideStats, RideSummary } from '@/lib/client/models/types';

export default function summariseRide(ride: Ride, stats: RideStats, ftp: number, startedAt: Date, ftpTestAverageWatts?: number): RideSummary {
  const hasSamples = stats.sampledSeconds > 0;
  const averageWatts = hasSamples ? stats.wattSeconds / stats.sampledSeconds : 0;
  const averageMph = hasSamples ? stats.miles / (stats.sampledSeconds / 3600) : 0;

  const summary: RideSummary = {
    id: crypto.randomUUID(),
    rideId: ride.id,
    rideName: ride.name,
    difficulty: ride.difficulty,
    startedAt: startedAt.toISOString(),
    durationSeconds: stats.sampledSeconds + stats.missingSeconds,
    averageWatts: Math.round(averageWatts),
    maxWatts: stats.maxWatts,
    miles: Math.round(stats.miles * 100) / 100,
    averageMph: Math.round(averageMph * 10) / 10,
    secondsInZone: [...stats.secondsInZone],
    missingSeconds: stats.missingSeconds,
    ftpUsed: ftp,
  };

  if (ride.ftpTest !== undefined) {
    summary.ftpTestSeconds = ride.ftpTest.seconds;
  }

  if (ftpTestAverageWatts !== undefined) {
    summary.ftpTestAverageWatts = ftpTestAverageWatts;
  }

  return summary;
}
