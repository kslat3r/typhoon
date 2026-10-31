import speedFromWatts from '@/lib/client/helpers/speed-from-watts';
import zoneForWatts from '@/lib/client/helpers/zone-for-watts';
import type { BikeSample, RideStats, ZoneNumber } from '@/lib/client/models/types';

function copyZones(zones: RideStats['secondsInZone']): RideStats['secondsInZone'] {
  return [...zones] as RideStats['secondsInZone'];
}

function withPlanned(stats: RideStats, zone: ZoneNumber | undefined, deltaSeconds: number): RideStats['plannedSecondsInZone'] {
  const zones: RideStats['plannedSecondsInZone'] = copyZones(stats.plannedSecondsInZone);
  if (zone !== undefined && deltaSeconds > 0) {
    zones[zone - 1] += deltaSeconds;
  }
  return zones;
}

function noteSecond(recent: number[], watts: number, npFourthSum: number, npWindows: number): { recentWatts: number[]; npFourthSum: number; npWindows: number } {
  const recentWatts: number[] = [...recent, watts];
  if (recentWatts.length > 30) {
    recentWatts.shift();
  }
  if (recentWatts.length < 30) {
    return { recentWatts, npFourthSum, npWindows };
  }
  const mean: number = recentWatts.reduce((sum: number, value: number): number => sum + value, 0) / 30;
  return { recentWatts, npFourthSum: npFourthSum + mean ** 4, npWindows: npWindows + 1 };
}

export default function accumulateRideStats(stats: RideStats, sample: BikeSample | null, deltaSeconds: number, ftp: number, plannedZone?: ZoneNumber): RideStats {
  const plannedSecondsInZone: RideStats['plannedSecondsInZone'] = withPlanned(stats, plannedZone, deltaSeconds);
  if (sample === null) {
    return {
      ...stats,
      secondsInZone: copyZones(stats.secondsInZone),
      plannedSecondsInZone,
      recentWatts: [...stats.recentWatts],
      missingSeconds: stats.missingSeconds + deltaSeconds,
    };
  }

  const secondsInZone: RideStats['secondsInZone'] = copyZones(stats.secondsInZone);
  secondsInZone[zoneForWatts(sample.watts, ftp) - 1] += deltaSeconds;

  let rpmSeconds: number = stats.rpmSeconds;
  let rpmSampledSeconds: number = stats.rpmSampledSeconds;
  let maxRpm: number = stats.maxRpm;
  if (sample.rpm !== null) {
    rpmSeconds += sample.rpm * deltaSeconds;
    rpmSampledSeconds += deltaSeconds;
    maxRpm = Math.max(maxRpm, sample.rpm);
  }

  let partialSeconds: number = stats.powerPartialSeconds;
  let partialWattSeconds: number = stats.powerPartialWattSeconds;
  let recentWatts: number[] = stats.recentWatts;
  let npFourthSum: number = stats.npFourthSum;
  let npWindows: number = stats.npWindows;
  let remaining: number = deltaSeconds;
  while (remaining > 1e-9) {
    const take: number = Math.min(1 - partialSeconds, remaining);
    partialSeconds += take;
    partialWattSeconds += sample.watts * take;
    remaining -= take;
    if (partialSeconds >= 1 - 1e-9) {
      const rolled = noteSecond(recentWatts, partialWattSeconds / partialSeconds, npFourthSum, npWindows);
      recentWatts = rolled.recentWatts;
      npFourthSum = rolled.npFourthSum;
      npWindows = rolled.npWindows;
      partialSeconds = 0;
      partialWattSeconds = 0;
    }
  }

  return {
    sampledSeconds: stats.sampledSeconds + deltaSeconds,
    missingSeconds: stats.missingSeconds,
    wattSeconds: stats.wattSeconds + sample.watts * deltaSeconds,
    maxWatts: Math.max(stats.maxWatts, sample.watts),
    miles: stats.miles + (speedFromWatts(sample.watts) * deltaSeconds) / 3600,
    secondsInZone,
    plannedSecondsInZone,
    rpmSeconds,
    rpmSampledSeconds,
    maxRpm,
    recentWatts,
    powerPartialSeconds: partialSeconds,
    powerPartialWattSeconds: partialWattSeconds,
    npFourthSum,
    npWindows,
  };
}
