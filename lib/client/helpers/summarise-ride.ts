import type { Ride, RideStats, RideSummary } from '@/lib/client/models/types';

export default function summariseRide(ride: Ride, stats: RideStats, ftp: number, startedAt: Date, ftpTestAverageWatts?: number): RideSummary {
  const hasSamples = stats.sampledSeconds > 0;
  const averageWatts = hasSamples ? stats.wattSeconds / stats.sampledSeconds : 0;
  const averageMph = hasSamples ? stats.miles / (stats.sampledSeconds / 3600) : 0;

  const normalizedPower: number | undefined = stats.npWindows > 0 ? Math.round((stats.npFourthSum / stats.npWindows) ** 0.25) : undefined;
  const summary: RideSummary = {
    id: crypto.randomUUID(),
    rideId: ride.id,
    rideName: ride.name,
    difficulty: ride.difficulty,
    startedAt: startedAt.toISOString(),
    durationSeconds: stats.sampledSeconds + stats.missingSeconds,
    plannedSeconds: ride.lengthSeconds,
    averageWatts: Math.round(averageWatts),
    maxWatts: stats.maxWatts,
    miles: Math.round(stats.miles * 100) / 100,
    averageMph: Math.round(averageMph * 10) / 10,
    secondsInZone: [...stats.secondsInZone],
    plannedSecondsInZone: [...stats.plannedSecondsInZone],
    missingSeconds: stats.missingSeconds,
    ftpUsed: ftp,
  };

  if (stats.rpmSampledSeconds > 0) {
    summary.averageRpm = Math.round(stats.rpmSeconds / stats.rpmSampledSeconds);
    summary.maxRpm = Math.round(stats.maxRpm);
  }
  if (normalizedPower !== undefined) {
    summary.normalizedPower = normalizedPower;
    if (ftp > 0) {
      summary.intensityFactor = Math.round((normalizedPower / ftp) * 100) / 100;
    }
  }
  if (hasSamples) {
    summary.kilojoules = Math.round(stats.wattSeconds / 1000);
    if (ftp > 0) {
      summary.intensityPercent = Math.round((averageWatts / ftp) * 100);
    }
  }

  if (ride.ftpTest !== undefined) {
    summary.ftpTestSeconds = ride.ftpTest.seconds;
  }

  if (ftpTestAverageWatts !== undefined) {
    summary.ftpTestAverageWatts = ftpTestAverageWatts;
  }

  return summary;
}
