import type { ZoneNumber } from '@/lib/client/models/types';

// One target cadence per zone for rides without a power meter.
export const TARGET_RPM: Record<ZoneNumber, number> = {
  1: 60,
  2: 70,
  3: 80,
  4: 85,
  5: 90,
  6: 100,
  7: 115,
};

export function targetRpmForZone(zone: ZoneNumber): number {
  return TARGET_RPM[zone];
}
